/**
 * Porównuje duplikaty produktów Ikonka - sprawdza która wersja ma więcej danych
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareDuplicates() {
  console.log('🔍 Porównuję duplikaty produktów Ikonka...\n');
  
  // Pobierz wszystkie produkty z pełnymi danymi
  const allProducts = await prisma.product.findMany({
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
      sku: 'asc'
    }
  });
  
  console.log(`📊 Łącznie produktów: ${allProducts.length}\n`);
  
  // Znajdź duplikaty i porównaj je
  const duplicates = [];
  
  for (const product of allProducts) {
    const sku = product.sku;
    
    // Sprawdź czy to SKU z ikonka-
    if (sku.startsWith('ikonka-')) {
      const baseSku = sku.replace('ikonka-', '');
      
      // Sprawdź czy istnieje produkt bez prefiksu
      const duplicate = allProducts.find(p => p.sku === baseSku);
      
      if (duplicate) {
        duplicates.push({
          baseSku,
          withPrefix: product,
          withoutPrefix: duplicate
        });
      }
    }
  }
  
  console.log(`📦 Znaleziono ${duplicates.length} par duplikatów\n`);
  
  if (duplicates.length === 0) {
    console.log('✅ Brak duplikatów!');
    return;
  }
  
  // Weź pierwsze 100 do porównania
  const samplesToCompare = duplicates.slice(0, 100);
  
  console.log(`📊 Porównuję pierwsze ${samplesToCompare.length} par:\n`);
  console.log('─'.repeat(120));
  
  let withPrefixBetter = 0;
  let withoutPrefixBetter = 0;
  let equal = 0;
  
  let withPrefixHasInventory = 0;
  let withoutPrefixHasInventory = 0;
  let bothHaveInventory = 0;
  let noneHasInventory = 0;
  
  let withPrefixHasTags = 0;
  let withoutPrefixHasTags = 0;
  let bothHaveTags = 0;
  let noneHasTags = 0;
  
  for (const dup of samplesToCompare) {
    const withPrefix = dup.withPrefix;
    const withoutPrefix = dup.withoutPrefix;
    
    // Porównaj dane
    const withPrefixScore = {
      hasImages: withPrefix.images.length > 0,
      imageCount: withPrefix.images.length,
      hasVariants: withPrefix.variants.length > 0,
      variantCount: withPrefix.variants.length,
      hasInventory: withPrefix.variants.some(v => v.inventory.length > 0),
      inventoryCount: withPrefix.variants.reduce((sum, v) => sum + v.inventory.length, 0),
      totalStock: withPrefix.variants.reduce((sum, v) => 
        sum + v.inventory.reduce((s, i) => s + i.quantity, 0), 0),
      hasTags: withPrefix.tags && withPrefix.tags.length > 0,
      tagCount: withPrefix.tags ? withPrefix.tags.length : 0,
      hasCategory: !!withPrefix.categoryId,
      hasDescription: !!withPrefix.description && withPrefix.description.length > 0,
      createdAt: withPrefix.createdAt
    };
    
    const withoutPrefixScore = {
      hasImages: withoutPrefix.images.length > 0,
      imageCount: withoutPrefix.images.length,
      hasVariants: withoutPrefix.variants.length > 0,
      variantCount: withoutPrefix.variants.length,
      hasInventory: withoutPrefix.variants.some(v => v.inventory.length > 0),
      inventoryCount: withoutPrefix.variants.reduce((sum, v) => sum + v.inventory.length, 0),
      totalStock: withoutPrefix.variants.reduce((sum, v) => 
        sum + v.inventory.reduce((s, i) => s + i.quantity, 0), 0),
      hasTags: withoutPrefix.tags && withoutPrefix.tags.length > 0,
      tagCount: withoutPrefix.tags ? withoutPrefix.tags.length : 0,
      hasCategory: !!withoutPrefix.categoryId,
      hasDescription: !!withoutPrefix.description && withoutPrefix.description.length > 0,
      createdAt: withoutPrefix.createdAt
    };
    
    // Oblicz punkty
    const withPrefixPoints = 
      (withPrefixScore.hasImages ? 1 : 0) +
      (withPrefixScore.hasVariants ? 1 : 0) +
      (withPrefixScore.hasInventory ? 2 : 0) +
      (withPrefixScore.hasTags ? 1 : 0) +
      (withPrefixScore.hasCategory ? 1 : 0) +
      (withPrefixScore.hasDescription ? 1 : 0);
    
    const withoutPrefixPoints = 
      (withoutPrefixScore.hasImages ? 1 : 0) +
      (withoutPrefixScore.hasVariants ? 1 : 0) +
      (withoutPrefixScore.hasInventory ? 2 : 0) +
      (withoutPrefixScore.hasTags ? 1 : 0) +
      (withoutPrefixScore.hasCategory ? 1 : 0) +
      (withoutPrefixScore.hasDescription ? 1 : 0);
    
    // Statystyki inventory
    if (withPrefixScore.hasInventory && withoutPrefixScore.hasInventory) {
      bothHaveInventory++;
    } else if (withPrefixScore.hasInventory) {
      withPrefixHasInventory++;
    } else if (withoutPrefixScore.hasInventory) {
      withoutPrefixHasInventory++;
    } else {
      noneHasInventory++;
    }
    
    // Statystyki tagów
    if (withPrefixScore.hasTags && withoutPrefixScore.hasTags) {
      bothHaveTags++;
    } else if (withPrefixScore.hasTags) {
      withPrefixHasTags++;
    } else if (withoutPrefixScore.hasTags) {
      withoutPrefixHasTags++;
    } else {
      noneHasTags++;
    }
    
    if (withPrefixPoints > withoutPrefixPoints) {
      withPrefixBetter++;
      console.log(`${dup.baseSku}: ✅ Z PREFIKSEM lepszy (${withPrefixPoints} vs ${withoutPrefixPoints})`);
      console.log(`  Z prefiksem: imgs=${withPrefixScore.imageCount}, variants=${withPrefixScore.variantCount}, inv=${withPrefixScore.inventoryCount}, stock=${withPrefixScore.totalStock}, tags=${withPrefixScore.tagCount}`);
      console.log(`  Bez prefiksu: imgs=${withoutPrefixScore.imageCount}, variants=${withoutPrefixScore.variantCount}, inv=${withoutPrefixScore.inventoryCount}, stock=${withoutPrefixScore.totalStock}, tags=${withoutPrefixScore.tagCount}`);
    } else if (withoutPrefixPoints > withPrefixPoints) {
      withoutPrefixBetter++;
      console.log(`${dup.baseSku}: ❌ BEZ PREFIKSU lepszy (${withoutPrefixPoints} vs ${withPrefixPoints})`);
      console.log(`  Z prefiksem: imgs=${withPrefixScore.imageCount}, variants=${withPrefixScore.variantCount}, inv=${withPrefixScore.inventoryCount}, stock=${withPrefixScore.totalStock}, tags=${withPrefixScore.tagCount}`);
      console.log(`  Bez prefiksu: imgs=${withoutPrefixScore.imageCount}, variants=${withoutPrefixScore.variantCount}, inv=${withoutPrefixScore.inventoryCount}, stock=${withoutPrefixScore.totalStock}, tags=${withoutPrefixScore.tagCount}`);
    } else {
      equal++;
    }
  }
  
  console.log('\n' + '─'.repeat(120));
  console.log('\n📊 PODSUMOWANIE:\n');
  console.log(`✅ Produkty Z PREFIKSEM lepsze: ${withPrefixBetter} (${(withPrefixBetter / samplesToCompare.length * 100).toFixed(1)}%)`);
  console.log(`❌ Produkty BEZ PREFIKSU lepsze: ${withoutPrefixBetter} (${(withoutPrefixBetter / samplesToCompare.length * 100).toFixed(1)}%)`);
  console.log(`⚖️  Równe: ${equal} (${(equal / samplesToCompare.length * 100).toFixed(1)}%)`);
  
  console.log('\n📦 STANY MAGAZYNOWE:');
  console.log(`  Tylko z prefiksem: ${withPrefixHasInventory}`);
  console.log(`  Tylko bez prefiksu: ${withoutPrefixHasInventory}`);
  console.log(`  Oba mają: ${bothHaveInventory}`);
  console.log(`  Żaden nie ma: ${noneHasInventory}`);
  
  console.log('\n🏷️  TAGI:');
  console.log(`  Tylko z prefiksem: ${withPrefixHasTags}`);
  console.log(`  Tylko bez prefiksu: ${withoutPrefixHasTags}`);
  console.log(`  Oba mają: ${bothHaveTags}`);
  console.log(`  Żaden nie ma: ${noneHasTags}`);
  
  console.log('\n💡 REKOMENDACJA:');
  if (withPrefixBetter > withoutPrefixBetter * 2) {
    console.log('   ✅ ZATRZYMAJ produkty Z PREFIKSEM (ikonka-XXX)');
    console.log('   ❌ USUŃ produkty BEZ PREFIKSU (XXX)');
  } else if (withoutPrefixBetter > withPrefixBetter * 2) {
    console.log('   ❌ ZATRZYMAJ produkty BEZ PREFIKSU (XXX)');
    console.log('   ✅ USUŃ produkty Z PREFIKSEM (ikonka-XXX)');
  } else {
    console.log('   ⚠️  WYNIKI NIEJEDNOZNACZNE - wymaga ręcznej analizy');
    console.log('   Sprawdź konkretne przypadki i zdecyduj, którą wersję zachować');
  }
}

compareDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
