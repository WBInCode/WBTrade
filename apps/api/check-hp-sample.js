/**
 * Sprawdza przykładowe 100 produktów z HP
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHpSample() {
  console.log('🔍 Sprawdzam przykładowe 100 produktów z HP...\n');
  
  // Pobierz produkty HP - sprawdź po SKU lub baselinkerProductId
  const hpProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { startsWith: 'hp-' } },
        { sku: { startsWith: 'HP' } },
        { tags: { has: 'hp' } }
      ]
    },
    take: 100,
    include: {
      images: true,
      variants: {
        include: {
          inventory: true
        }
      },
      category: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log(`📊 Znaleziono ${hpProducts.length} produktów HP\n`);
  console.log('─'.repeat(120));
  
  if (hpProducts.length === 0) {
    console.log('❌ Brak produktów HP w bazie!');
    
    // Sprawdź wszystkie produkty bez filtra
    const allCount = await prisma.product.count();
    console.log(`\n📊 Łącznie produktów w bazie: ${allCount}`);
    
    // Sprawdź przykładowe SKU
    const samples = await prisma.product.findMany({
      take: 20,
      select: {
        sku: true,
        name: true,
        tags: true,
        baselinkerProductId: true
      }
    });
    
    console.log('\n📦 Przykładowe SKU w bazie:');
    samples.forEach(p => {
      console.log(`   ${p.sku} - ${p.name.substring(0, 50)} (Tags: ${p.tags?.join(', ') || 'brak'})`);
    });
    
    return;
  }
  
  // Statystyki
  let withPrefix = 0;
  let withoutPrefix = 0;
  let withImages = 0;
  let withInventory = 0;
  let withTags = 0;
  let withCategory = 0;
  
  console.log('\n📦 Lista produktów HP:\n');
  
  for (const product of hpProducts.slice(0, 20)) {
    const hasPrefix = product.sku.startsWith('hp-');
    const imageCount = product.images.length;
    const variantCount = product.variants.length;
    const inventoryCount = product.variants.reduce((sum, v) => sum + v.inventory.length, 0);
    const totalStock = product.variants.reduce((sum, v) => 
      sum + v.inventory.reduce((s, i) => s + i.quantity, 0), 0);
    
    if (hasPrefix) withPrefix++;
    else withoutPrefix++;
    
    if (imageCount > 0) withImages++;
    if (inventoryCount > 0) withInventory++;
    if (product.tags && product.tags.length > 0) withTags++;
    if (product.categoryId) withCategory++;
    
    console.log(`${hasPrefix ? '✅' : '❌'} SKU: ${product.sku}`);
    console.log(`   Nazwa: ${product.name.substring(0, 60)}`);
    console.log(`   BL ID: ${product.baselinkerProductId || 'brak'}`);
    console.log(`   Images: ${imageCount}, Variants: ${variantCount}, Inventory: ${inventoryCount}, Stock: ${totalStock}`);
    console.log(`   Tags: ${product.tags?.join(', ') || 'brak'}`);
    console.log(`   Kategoria: ${product.category?.name || 'brak'}`);
    console.log('');
  }
  
  // Podsumowanie statystyk
  console.log('─'.repeat(120));
  console.log('\n📊 PODSUMOWANIE:\n');
  console.log(`Łącznie produktów: ${hpProducts.length}`);
  console.log(`Z prefiksem 'hp-': ${withPrefix} (${(withPrefix / hpProducts.length * 100).toFixed(1)}%)`);
  console.log(`Bez prefiksu: ${withoutPrefix} (${(withoutPrefix / hpProducts.length * 100).toFixed(1)}%)`);
  console.log(`\nZ obrazkami: ${withImages} (${(withImages / hpProducts.length * 100).toFixed(1)}%)`);
  console.log(`Ze stanami: ${withInventory} (${(withInventory / hpProducts.length * 100).toFixed(1)}%)`);
  console.log(`Z tagami: ${withTags} (${(withTags / hpProducts.length * 100).toFixed(1)}%)`);
  console.log(`Z kategorią: ${withCategory} (${(withCategory / hpProducts.length * 100).toFixed(1)}%)`);
  
  // Sprawdź duplikaty HP
  console.log('\n\n🔍 Sprawdzam duplikaty HP...\n');
  
  const duplicates = [];
  for (const product of hpProducts) {
    if (product.sku.startsWith('hp-')) {
      const baseSku = product.sku.replace('hp-', '');
      const duplicate = hpProducts.find(p => p.sku === baseSku);
      
      if (duplicate) {
        duplicates.push({
          withPrefix: product,
          withoutPrefix: duplicate
        });
      }
    }
  }
  
  if (duplicates.length > 0) {
    console.log(`❌ Znaleziono ${duplicates.length} duplikatów HP!\n`);
    duplicates.slice(0, 10).forEach(dup => {
      console.log(`📦 ${dup.withPrefix.sku} <-> ${dup.withoutPrefix.sku}`);
    });
  } else {
    console.log('✅ Brak duplikatów HP!');
  }
}

checkHpSample()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
