const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== STATYSTYKI STANÓW MAGAZYNOWYCH ===\n');
  
  // Sprawdź warianty ze stanem = 0
  const inventoryWithZero = await prisma.inventory.count({
    where: { quantity: 0 }
  });
  
  const inventoryWithStock = await prisma.inventory.count({
    where: { quantity: { gt: 0 } }
  });
  
  console.log('REKORDY INVENTORY:');
  console.log(`Stan = 0: ${inventoryWithZero}`);
  console.log(`Stan > 0: ${inventoryWithStock}`);
  console.log('');
  
  // Produkty, których wszystkie warianty mają stan = 0
  const allVariants = await prisma.productVariant.findMany({
    include: {
      inventory: true,
      product: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });
  
  // Grupuj warianty po productId
  const productStockMap = new Map();
  allVariants.forEach(variant => {
    if (!productStockMap.has(variant.productId)) {
      productStockMap.set(variant.productId, {
        productId: variant.productId,
        status: variant.product.status,
        variants: []
      });
    }
    
    // Suma stanów ze wszystkich lokalizacji dla tego wariantu
    const totalStock = variant.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    productStockMap.get(variant.productId).variants.push({
      quantity: totalStock
    });
  });
  
  // Policz produkty ze stanem = 0 we wszystkich wariantach
  let activeProductsWithZeroStock = 0;
  let activeProductsWithStock = 0;
  
  productStockMap.forEach((data) => {
    if (data.status !== 'ACTIVE') return;
    
    const totalStock = data.variants.reduce((sum, v) => sum + v.quantity, 0);
    if (totalStock === 0) {
      activeProductsWithZeroStock++;
    } else {
      activeProductsWithStock++;
    }
  });
  
  console.log('PRODUKTY AKTYWNE (status=ACTIVE):');
  console.log(`Produkty ze stanem = 0: ${activeProductsWithZeroStock}`);
  console.log(`Produkty ze stanem > 0: ${activeProductsWithStock}`);
  console.log(`RAZEM aktywnych: ${activeProductsWithZeroStock + activeProductsWithStock}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
