/**
 * Usuwa duplikaty produktów Ikonka - pozostawia tylko produkty Z PREFIKSEM
 * Produkty BEZ prefiksu to starsze wersje i powinny zostać usunięte
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeDuplicates() {
  console.log('🗑️  Usuwam duplikaty produktów Ikonka...\n');
  
  // Pobierz wszystkie produkty
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      baselinkerProductId: true,
      createdAt: true
    },
    orderBy: {
      sku: 'asc'
    }
  });
  
  console.log(`📊 Łącznie produktów: ${allProducts.length}\n`);
  
  // Znajdź produkty do usunięcia (Z PREFIKSEM, które mają wersję BEZ prefiksu)
  const toDelete = [];
  
  for (const product of allProducts) {
    const sku = product.sku;
    
    // Sprawdź czy to SKU Z prefiksem
    if (sku.startsWith('ikonka-')) {
      const baseSku = sku.replace('ikonka-', '');
      // Sprawdź czy istnieje produkt BEZ prefiksu
      const withoutPrefix = allProducts.find(p => p.sku === baseSku);
      
      if (withoutPrefix) {
        toDelete.push(product);
      }
    }
  }
  
  if (toDelete.length === 0) {
    console.log('✅ Brak duplikatów do usunięcia!');
    return;
  }
  
  console.log(`❌ Znaleziono ${toDelete.length} duplikatów do usunięcia:\n`);
  
  let deleted = 0;
  let errors = 0;
  
  for (const product of toDelete) {
    try {
      console.log(`   🗑️  Usuwam: ${product.sku} (ID: ${product.id})`);
      
      // Usuń powiązane dane
      await prisma.productImage.deleteMany({
        where: { productId: product.id }
      });
      
      await prisma.productVariant.deleteMany({
        where: { productId: product.id }
      });
      
      await prisma.product.delete({
        where: { id: product.id }
      });
      
      deleted++;
    } catch (error) {
      console.error(`   ✗ Błąd podczas usuwania ${product.sku}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Usuń ${deleted} duplikatów`);
  if (errors > 0) {
    console.log(`❌ Błędy: ${errors}`);
  }
  
  console.log(`\n💡 Teraz uruchom sync-ikonka.js, aby zsynchronizować produkty z poprawnym prefiksem`);
}

removeDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
