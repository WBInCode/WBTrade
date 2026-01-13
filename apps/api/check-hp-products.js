/**
 * Sprawdź produkty HP (SKU: 10*)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Szukam produktów HP (SKU zaczyna się na "10")\n');
  console.log('='.repeat(60));
  
  const hp = await prisma.product.count({
    where: { sku: { startsWith: '10' } }
  });
  
  console.log(`\n🏥 Znaleziono ${hp.toLocaleString('pl-PL')} produktów HP (SKU: 10*)\n`);
  
  if (hp > 0) {
    console.log('📋 Przykłady produktów HP:\n');
    
    const examples = await prisma.product.findMany({
      where: { sku: { startsWith: '10' } },
      select: { 
        sku: true, 
        name: true, 
        baselinkerProductId: true,
        status: true
      },
      take: 15
    });
    
    examples.forEach((p, i) => {
      console.log(`${i + 1}. SKU: ${p.sku}`);
      console.log(`   Nazwa: ${p.name.substring(0, 60)}${p.name.length > 60 ? '...' : ''}`);
      console.log(`   Baselinker ID: ${p.baselinkerProductId || 'brak'}`);
      console.log(`   Status: ${p.status}\n`);
    });
  }
  
  // Sprawdź czy mają prefix hp- w baselinkerProductId
  const hpWithPrefix = await prisma.product.count({
    where: {
      AND: [
        { sku: { startsWith: '10' } },
        { baselinkerProductId: { startsWith: 'hp-' } }
      ]
    }
  });
  
  const hpWithoutPrefix = await prisma.product.count({
    where: {
      AND: [
        { sku: { startsWith: '10' } },
        { OR: [
          { baselinkerProductId: { not: { startsWith: 'hp-' } } },
          { baselinkerProductId: null }
        ]}
      ]
    }
  });
  
  console.log('='.repeat(60));
  console.log('\n📊 Analiza prefiksów baselinkerProductId:');
  console.log(`   Z prefiksem "hp-": ${hpWithPrefix}`);
  console.log(`   Bez prefiksu "hp-": ${hpWithoutPrefix}`);
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
