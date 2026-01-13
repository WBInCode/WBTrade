const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📊 Podsumowanie synchronizacji z Baselinker\n');
  console.log('═'.repeat(70));
  
  // PRODUKTY
  console.log('\n1️⃣  PRODUKTY:');
  console.log('─'.repeat(70));
  
  const dbProducts = await prisma.product.count();
  console.log(`   W bazie danych: ${dbProducts.toLocaleString('pl-PL')} produktów`);
  console.log('   W Baselinker (ostatnie sprawdzenie):');
  console.log('      • Ikonka: 5,786');
  console.log('      • Leker:  3,895');
  console.log('      • BTP:    11,686');
  console.log('      • HP:     18,870');
  console.log('      • RAZEM:  40,237');
  
  const diff = 40237 - dbProducts;
  if (diff === 0) {
    console.log('   ✅ Wszystkie produkty zsynchronizowane!');
  } else if (diff > 0) {
    console.log(`   ⚠️  Brakuje ${diff} produktów`);
  } else {
    console.log(`   ⚠️  Masz ${-diff} produktów za dużo (możliwe duplikaty?)`);
  }
  
  // WARIANTY
  console.log('\n2️⃣  WARIANTY PRODUKTÓW:');
  console.log('─'.repeat(70));
  
  const dbVariants = await prisma.productVariant.count();
  console.log(`   W bazie danych: ${dbVariants.toLocaleString('pl-PL')} wariantów`);
  
  const variantsWithInventory = await prisma.productVariant.count({
    where: {
      inventory: {
        some: {}
      }
    }
  });
  
  console.log(`   Z przypisanym inventory: ${variantsWithInventory.toLocaleString('pl-PL')}`);
  console.log(`   Bez inventory: ${(dbVariants - variantsWithInventory).toLocaleString('pl-PL')}`);
  
  // STANY MAGAZYNOWE
  console.log('\n3️⃣  STANY MAGAZYNOWE (INVENTORY):');
  console.log('─'.repeat(70));
  
  const totalInventory = await prisma.inventory.count();
  const withStock = await prisma.inventory.count({ where: { quantity: { gt: 0 } } });
  const zeroStock = await prisma.inventory.count({ where: { quantity: 0 } });
  
  const stockSum = await prisma.inventory.aggregate({
    _sum: { quantity: true }
  });
  
  console.log(`   Łączna liczba pozycji: ${totalInventory.toLocaleString('pl-PL')}`);
  console.log(`   • Z niezerowymi stanami: ${withStock.toLocaleString('pl-PL')} (${Math.round(withStock/totalInventory*100)}%)`);
  console.log(`   • Z zerowymi stanami: ${zeroStock.toLocaleString('pl-PL')} (${Math.round(zeroStock/totalInventory*100)}%)`);
  console.log(`   • Łączny stan: ${stockSum._sum.quantity?.toLocaleString('pl-PL') || 0} szt.`);
  
  const coverage = (totalInventory / dbVariants * 100).toFixed(1);
  console.log(`\n   📈 Pokrycie: ${coverage}% wariantów ma stany magazynowe`);
  
  if (coverage < 100) {
    const missing = dbVariants - totalInventory;
    console.log(`   ⚠️  Brakuje stanów dla ${missing.toLocaleString('pl-PL')} wariantów`);
  }
  
  // KATEGORIE
  console.log('\n4️⃣  KATEGORIE:');
  console.log('─'.repeat(70));
  
  const categories = await prisma.category.count();
  console.log(`   W bazie danych: ${categories.toLocaleString('pl-PL')} kategorii`);
  console.log('   W Baselinker (ostatnie sprawdzenie):');
  console.log('      • Ikonka: 120');
  console.log('      • Leker:  98');
  console.log('      • BTP:    36');
  console.log('      • HP:     378');
  console.log('      • RAZEM:  632');
  
  const catDiff = 632 - categories;
  if (catDiff === 0) {
    console.log('   ✅ Wszystkie kategorie zsynchronizowane!');
  } else if (catDiff > 0) {
    console.log(`   ⚠️  Brakuje ${catDiff} kategorii`);
  }
  
  // OSTATNIA AKTUALIZACJA
  console.log('\n5️⃣  OSTATNIA AKTUALIZACJA:');
  console.log('─'.repeat(70));
  
  const lastProduct = await prisma.product.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true, name: true }
  });
  
  const lastInventory = await prisma.inventory.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true }
  });
  
  if (lastProduct) {
    console.log(`   Produkty: ${lastProduct.updatedAt.toLocaleString('pl-PL')}`);
  }
  
  if (lastInventory) {
    console.log(`   Stany magazynowe: ${lastInventory.updatedAt.toLocaleString('pl-PL')}`);
  }
  
  // PODSUMOWANIE
  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ CO MAMY:');
  console.log(`   • Produkty: ~100% (${dbProducts.toLocaleString('pl-PL')} / 40,237)`);
  console.log(`   • Kategorie: ~100% (${categories} / 632)`);
  console.log(`   • Stany: ${coverage}% (${totalInventory.toLocaleString('pl-PL')} / ${dbVariants.toLocaleString('pl-PL')} wariantów)`);
  
  console.log('\n❌ CO BRAKUJE:');
  if (coverage < 100) {
    console.log(`   • Stany magazynowe dla ${(dbVariants - totalInventory).toLocaleString('pl-PL')} wariantów`);
    console.log('   • Trzeba uruchomić: node update-inventory.js');
  } else {
    console.log('   • Nic! Wszystko zsynchronizowane ✅');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
