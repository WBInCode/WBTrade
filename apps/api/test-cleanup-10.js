/**
 * Test czyszczenia - DRY RUN na 10 produktach
 * Pokazuje co by się zmieniło BEZ zapisywania do bazy
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanName(name) {
  return name
    .replace(/^\[BTP\]\s*/i, '')
    .replace(/^\[HP\]\s*/i, '')
    .replace(/^\[.*?\]\s*/g, '')
    .trim();
}

function cleanSlug(slug) {
  return slug
    .replace(/^btp-/i, '')
    .replace(/^hp-/i, '')
    .replace(/-\d{6,}$/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanSku(sku) {
  return sku
    .replace(/^BTP-/i, '')
    .replace(/^HP-/i, '')
    .replace(/^[A-Z]+-/g, '');
}

async function testCleanup() {
  console.log('🧪 TEST CZYSZCZENIA - 10 PRODUKTÓW\n');
  
  // Pobierz 10 przykładowych produktów
  const products = await prisma.product.findMany({
    take: 10,
    include: {
      category: true,
      variants: true
    }
  });
  
  console.log(`Znaleziono ${products.length} produktów do testu:\n`);
  
  for (const product of products) {
    console.log('━'.repeat(80));
    console.log(`📦 Produkt ID: ${product.id}`);
    console.log('\n📝 NAZWA:');
    console.log(`   PRZED: "${product.name}"`);
    console.log(`   PO:    "${cleanName(product.name)}"`);
    
    console.log('\n🔗 SLUG:');
    console.log(`   PRZED: "${product.slug}"`);
    console.log(`   PO:    "${cleanSlug(product.slug)}"`);
    
    console.log('\n🏷️  SKU:');
    console.log(`   PRZED: "${product.sku}"`);
    console.log(`   PO:    "${cleanSku(product.sku)}"`);
    
    if (product.category) {
      console.log('\n📁 KATEGORIA:');
      console.log(`   PRZED: "${product.category.name}" (${product.category.slug})`);
      console.log(`   PO:    "${cleanName(product.category.name)}" (${cleanSlug(product.category.slug)})`);
    }
    
    console.log('\n🔢 WARIANTY: ' + product.variants.length);
    if (product.variants.length > 0) {
      const variant = product.variants[0];
      console.log(`   Przykład - SKU wariantu:`);
      console.log(`   PRZED: "${variant.sku}"`);
      console.log(`   PO:    "${cleanSku(variant.sku)}"`);
    }
    
    console.log('');
  }
  
  console.log('━'.repeat(80));
  console.log('\n✅ TEST ZAKOŃCZONY');
  console.log('ℹ️  To był DRY RUN - żadne dane nie zostały zmienione w bazie!');
  console.log('\nJeśli wynik wygląda OK, uruchom: node cleanup-database.js');
  
  await prisma.$disconnect();
}

testCleanup().catch(err => {
  console.error('❌ Błąd:', err);
  process.exit(1);
});
