/**
 * Test cleanup na konkretnych produktach
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const testIds = [
  'cmk74qh1k0hb6r3li9e7148c4',
  'cmk74qh8n0hblr3lik8x882s8',
  'cmk74qhfe0hbzr3lig8wbn9s9',
  'cmk74qhm20hc8r3liy0p5ib1g',
  'cmk74qhsv0hcgr3lifnddasmm',
  'cmk74qhzi0hcnr3li5kapi5yj',
  'cmk74qi610hcxr3lieeebfitq',
  'cmk74qici0hdgr3lihdpfahk0',
  'cmk74qij30hdlr3lis2ndvw4f',
  'cmk74qipi0hdvr3lixoptlzyv',
];

function cleanName(name) {
  return name
    .replace(/^\[BTP\]\s*/i, '')
    .replace(/^\[HP\]\s*/i, '')
    .replace(/^\[IKONKA\]\s*/i, '')
    .replace(/^\[.*?\]\s*/, '')
    .trim();
}

function cleanSlug(slug) {
  let cleaned = slug
    .replace(/^btp-/i, '')
    .replace(/^hp-/i, '')
    .replace(/^ikonka-/i, '');
  
  cleaned = cleaned.replace(/-\d{6,}$/, '');
  
  return cleaned;
}

function cleanSku(sku) {
  if (!sku) return sku;
  return sku
    .replace(/^BTP-/i, '')
    .replace(/^HP-/i, '')
    .replace(/^IKONKA-/i, '');
}

async function testCleanup() {
  console.log('🔍 Test czyszczenia na 10 produktach\n');
  
  const products = await prisma.product.findMany({
    where: {
      id: { in: testIds }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      category: {
        select: {
          name: true,
          slug: true
        }
      }
    }
  });
  
  console.log(`Znaleziono ${products.length} produktów\n`);
  
  for (const product of products) {
    console.log('─'.repeat(80));
    console.log(`ID: ${product.id.slice(0, 12)}...`);
    console.log(`\nKategoria:`);
    console.log(`  PRZED: ${product.category?.name || 'brak'}`);
    console.log(`  PRZED slug: ${product.category?.slug || 'brak'}`);
    console.log(`  PO:    ${cleanName(product.category?.name || '')}`);
    console.log(`  PO slug:    ${cleanSlug(product.category?.slug || '')}`);
    
    console.log(`\nProdukt:`);
    console.log(`  PRZED: ${product.name}`);
    console.log(`  PO:    ${cleanName(product.name)}`);
    
    console.log(`\nSlug:`);
    console.log(`  PRZED: ${product.slug}`);
    console.log(`  PO:    ${cleanSlug(product.slug)}`);
    
    console.log(`\nSKU:`);
    console.log(`  PRZED: ${product.sku || 'brak'}`);
    console.log(`  PO:    ${cleanSku(product.sku) || 'brak'}`);
    console.log('');
  }
  
  console.log('─'.repeat(80));
  console.log('\n✅ Test zakończony - NIE ZAPISANO zmian w bazie');
  console.log('Jeśli wyniki są OK, uruchom: npx ts-node scripts/cleanup-slugs-and-sku.ts');
}

testCleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
