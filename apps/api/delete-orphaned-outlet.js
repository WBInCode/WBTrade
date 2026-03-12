/**
 * Usuwa produkty outlet z bazy, których nie ma w BaseLinker
 */
const { PrismaClient } = require('@prisma/client');
const https = require('https');
require('dotenv').config();

const prisma = new PrismaClient();
const BL_TOKEN = process.env.BASELINKER_API_TOKEN;
const OUTLET_INVENTORY_ID = '23662';

function callBaselinker(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = `token=${BL_TOKEN}&method=${method}&parameters=${encodeURIComponent(JSON.stringify(params))}`;
    const req = https.request({
      hostname: 'api.baselinker.com',
      path: '/connector.php',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('Pobieranie produktów z BL outlet...');
  const stockResp = await callBaselinker('getInventoryProductsStock', { inventory_id: OUTLET_INVENTORY_ID });
  const blProductIds = new Set(Object.keys(stockResp.products || {}));
  console.log(`Produkty w BL: ${blProductIds.size}`);

  console.log('Pobieranie produktów outlet z bazy...');
  const outletProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'outlet-' } },
    include: {
      variants: {
        include: {
          orderItems: { select: { id: true }, take: 1 },
          cartItems: { select: { id: true } },
          stockMovements: { select: { id: true } },
        }
      }
    }
  });
  console.log(`Produkty outlet w bazie: ${outletProducts.length}`);

  const notInBL = outletProducts.filter(p => {
    const blIdRaw = p.baselinkerProductId.replace('outlet-', '');
    return !blProductIds.has(blIdRaw);
  });

  const toDelete = [];
  const skipped = [];
  for (const p of notInBL) {
    const hasOrders = p.variants.some(v => v.orderItems.length > 0);
    if (hasOrders) {
      skipped.push(p);
    } else {
      toDelete.push(p);
    }
  }

  console.log(`\nBrak w BL: ${notInBL.length}`);
  console.log(`Do usunięcia: ${toDelete.length}`);
  if (skipped.length > 0) {
    console.log(`Pominięte (mają zamówienia): ${skipped.length}`);
    for (const p of skipped) {
      console.log(`  ⚠️ ${p.sku.padEnd(26)} | ${p.name.substring(0, 50)}`);
    }
  }
  console.log('');
  for (const p of toDelete) {
    console.log(`  ${p.sku.padEnd(26)} | ${p.name.substring(0, 50)}`);
  }

  if (toDelete.length === 0) {
    console.log('Nic do usunięcia.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nUsuwanie ${toDelete.length} produktów...`);
  let deleted = 0;

  for (const product of toDelete) {
    const variantIds = product.variants.map(v => v.id);
    
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
      await tx.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
      await tx.wishlistItem.updateMany({ where: { variantId: { in: variantIds } }, data: { variantId: null } });
      await tx.shoppingListItem.updateMany({ where: { variantId: { in: variantIds } }, data: { variantId: null } });
      await tx.product.delete({ where: { id: product.id } });
    });

    deleted++;
    process.stdout.write(`  Usunięto: ${deleted}/${toDelete.length}\r`);
  }

  console.log(`\n✅ Usunięto ${deleted} produktów, których nie było w BaseLinker`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
