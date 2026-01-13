/**
 * Sprawdza duplikaty produktów Ikonka - produkty z i bez prefiksu
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('🔍 Sprawdzam duplikaty produktów Ikonka...\n');
  
  // Pobierz wszystkie produkty z SKU zawierającym pattern
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
  
  // Znajdź potencjalne duplikaty
  const duplicates = [];
  const skuMap = new Map();
  
  for (const product of allProducts) {
    const sku = product.sku;
    
    // Sprawdź czy to SKU z ikonka-
    if (sku.startsWith('ikonka-')) {
      const baseSku = sku.replace('ikonka-', '');
      
      // Sprawdź czy istnieje produkt bez prefiksu
      const duplicate = allProducts.find(p => p.sku === baseSku);
      
      if (duplicate) {
        duplicates.push({
          withPrefix: product,
          withoutPrefix: duplicate,
          baseSku
        });
      }
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ Brak duplikatów!');
  } else {
    console.log(`❌ Znaleziono ${duplicates.length} duplikatów:\n`);
    
    for (const dup of duplicates) {
      console.log(`📦 Base SKU: ${dup.baseSku}`);
      console.log(`   Z prefiksem: ${dup.withPrefix.sku} (ID: ${dup.withPrefix.id}, BL: ${dup.withPrefix.baselinkerProductId})`);
      console.log(`   Bez prefiksu: ${dup.withoutPrefix.sku} (ID: ${dup.withoutPrefix.id}, BL: ${dup.withoutPrefix.baselinkerProductId})`);
      console.log(`   Data utworzenia z prefiksem: ${dup.withPrefix.createdAt}`);
      console.log(`   Data utworzenia bez prefiksu: ${dup.withoutPrefix.createdAt}`);
      console.log('');
    }
    
    console.log(`\n💡 Zalecenia:`);
    console.log(`   1. Usuń produkty BEZ prefiksu (starsze wersje)`);
    console.log(`   2. Upewnij się że sync-ikonka.js NIE usuwa prefiksu z SKU`);
  }
}

checkDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
