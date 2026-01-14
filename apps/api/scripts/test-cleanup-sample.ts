import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test product IDs provided by user
const TEST_IDS = [
  'cmk74qh1k0hb6r3li9e7148c4',
  'cmk74qh8n0hblr3lik8x882s8',
  'cmk74qha80hbnr3li66yf8qti',
  'cmk74qha90hbor3liytm3gwwf',
];

function cleanName(name: string): string {
  return name
    .replace(/^\[LEKER\]\s*/i, '')
    .replace(/^\[BTP\]\s*/i, '')
    .replace(/^\[HP\]\s*/i, '')
    .replace(/^\[IKONKA\]\s*/i, '')
    .trim();
}

function cleanSlug(slug: string): string {
  let cleaned = slug
    .replace(/^leker-/i, '')
    .replace(/^btp-/i, '')
    .replace(/^hp-/i, '')
    .replace(/^ikonka-/i, '');
  
  cleaned = cleaned.replace(/-\d{6,}$/, '');
  
  return cleaned;
}

function cleanSku(sku: string): string {
  return sku
    .replace(/^LEKER-/i, '')
    .replace(/^BTP-/i, '')
    .replace(/^HP-/i, '')
    .replace(/^IKONKA-/i, '');
}

async function testCleanup() {
  console.log('🧪 TEST CLEANUP - Próbka produktów\n');
  
  const products = await prisma.product.findMany({
    where: {
      id: { in: TEST_IDS }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true
    }
  });
  
  if (products.length === 0) {
    console.log('❌ Nie znaleziono żadnych produktów z podanych ID');
    return;
  }
  
  console.log(`✅ Znaleziono ${products.length} produktów\n`);
  
  for (const product of products) {
    const cleanedName = cleanName(product.name);
    const cleanedSlug = cleanSlug(product.slug);
    const cleanedSku = cleanSku(product.sku || '');
    
    console.log('─'.repeat(80));
    console.log(`📦 ID: ${product.id}`);
    console.log();
    
    // Name comparison
    if (product.name !== cleanedName) {
      console.log('  NAME:');
      console.log(`    BEFORE: ${product.name}`);
      console.log(`    AFTER:  ${cleanedName}`);
    } else {
      console.log(`  NAME: ${product.name} (bez zmian)`);
    }
    
    console.log();
    
    // Slug comparison
    if (product.slug !== cleanedSlug) {
      console.log('  SLUG:');
      console.log(`    BEFORE: ${product.slug}`);
      console.log(`    AFTER:  ${cleanedSlug}`);
    } else {
      console.log(`  SLUG: ${product.slug} (bez zmian)`);
    }
    
    console.log();
    
    // SKU comparison
    if (product.sku) {
      if (product.sku !== cleanedSku) {
        console.log('  SKU:');
        console.log(`    BEFORE: ${product.sku}`);
        console.log(`    AFTER:  ${cleanedSku}`);
      } else {
        console.log(`  SKU: ${product.sku} (bez zmian)`);
      }
    } else {
      console.log('  SKU: (brak)');
    }
    
    console.log();
  }
  
  console.log('─'.repeat(80));
  console.log('\n✅ TEST zakończony - NIE WYKONANO żadnych zmian w bazie');
  console.log('💡 Aby wykonać prawdziwe czyszczenie uruchom: ts-node cleanup-slugs-and-sku.ts');
}

testCleanup()
  .catch(e => {
    console.error('❌ Błąd:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
