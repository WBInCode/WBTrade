const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analiza produktów w bazie:\n');

  // Wszystkie produkty
  const total = await prisma.product.count();
  
  // Produkty z różnych magazynów
  const ikonka = await prisma.product.count({
    where: {
      AND: [
        { baselinkerProductId: { not: { startsWith: 'leker-' } } },
        { baselinkerProductId: { not: { startsWith: 'btp-' } } },
        { baselinkerProductId: { not: { startsWith: 'hp-' } } }
      ]
    }
  });

  const leker = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'leker-' } }
  });

  const btp = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'btp-' } }
  });

  const hp = await prisma.product.count({
    where: { baselinkerProductId: { startsWith: 'hp-' } }
  });

  // Produkty bez baselinkerProductId
  const noBaselinker = await prisma.product.count({
    where: { baselinkerProductId: null }
  });

  // Duplikaty SKU
  const duplicateSkus = await prisma.$queryRaw`
    SELECT sku, COUNT(*) as count
    FROM products
    GROUP BY sku
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `;

  console.log(`📦 RAZEM produktów: ${total.toLocaleString('pl-PL')}`);
  console.log(`🏢 Ikonka (bez prefiksów): ${ikonka.toLocaleString('pl-PL')}`);
  console.log(`🏢 Leker (leker-): ${leker.toLocaleString('pl-PL')}`);
  console.log(`🏢 BTP (btp-): ${btp.toLocaleString('pl-PL')}`);
  console.log(`🏢 HP (hp-): ${hp.toLocaleString('pl-PL')}`);
  console.log(`❓ Bez baselinkerProductId: ${noBaselinker.toLocaleString('pl-PL')}`);
  console.log(`\n➕ Suma magazynów: ${(ikonka + leker + btp + hp).toLocaleString('pl-PL')}`);
  
  if (duplicateSkus.length > 0) {
    console.log(`\n⚠️  Top 10 duplikujących się SKU:`);
    duplicateSkus.forEach(row => {
      console.log(`   ${row.sku}: ${row.count}x`);
    });
  }

  // Sprawdź ostatnio dodane produkty
  const recent = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      baselinkerProductId: true,
      sku: true,
      name: true,
      createdAt: true
    }
  });

  console.log(`\n🆕 Ostatnio dodane produkty:`);
  recent.forEach(p => {
    console.log(`   [${p.baselinkerProductId}] ${p.sku} - ${p.name.substring(0, 40)}... (${p.createdAt.toLocaleString('pl-PL')})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
