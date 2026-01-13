/**
 * Sprawdź liczbę produktów w bazie - Ikonka vs Leker
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Statystyki produktów w bazie danych\n');
  console.log('='.repeat(60));
  
  // Produkty Ikonka (bez prefiksu leker-)
  const ikonka = await prisma.product.count({
    where: {
      OR: [
        { baselinkerProductId: { not: { contains: 'leker-' } } },
        { baselinkerProductId: null }
      ]
    }
  });
  
  // Produkty Leker (z prefiksem leker-)
  const leker = await prisma.product.count({
    where: {
      baselinkerProductId: { contains: 'leker-' }
    }
  });
  
  // Razem
  const total = await prisma.product.count();
  
  // Produkty aktywne
  const active = await prisma.product.count({
    where: { status: 'ACTIVE' }
  });
  
  // Produkty draft
  const draft = await prisma.product.count({
    where: { status: 'DRAFT' }
  });
  
  console.log('\n🏬 MAGAZYN IKONKA:');
  console.log(`   Produktów: ${ikonka.toLocaleString('pl-PL')}`);
  
  console.log('\n🏪 MAGAZYN LEKER:');
  console.log(`   Produktów: ${leker.toLocaleString('pl-PL')}`);
  
  console.log('\n📦 RAZEM:');
  console.log(`   Wszystkich produktów: ${total.toLocaleString('pl-PL')}`);
  console.log(`   Aktywnych: ${active.toLocaleString('pl-PL')}`);
  console.log(`   Draft: ${draft.toLocaleString('pl-PL')}`);
  
  // Warianty produktów
  const variants = await prisma.productVariant.count();
  console.log(`   Wariantów: ${variants.toLocaleString('pl-PL')}`);
  
  // Stany magazynowe
  const inventory = await prisma.inventory.count();
  const totalStock = await prisma.inventory.aggregate({
    _sum: { quantity: true }
  });
  
  console.log('\n📊 STANY MAGAZYNOWE:');
  console.log(`   Pozycji w magazynie: ${inventory.toLocaleString('pl-PL')}`);
  console.log(`   Łączny stan: ${totalStock._sum.quantity?.toLocaleString('pl-PL') || 0} szt.`);
  
  console.log('\n' + '='.repeat(60));
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
