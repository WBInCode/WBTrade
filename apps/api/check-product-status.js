const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductStatus() {
  try {
    // Sprawdź produkty według statusu
    const statusCounts = await prisma.product.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('Produkty według statusu:');
    statusCounts.forEach(s => {
      console.log(`  ${s.status}: ${s._count}`);
    });

    const total = await prisma.product.count();
    console.log(`\nRazem produktów: ${total}`);

    // Sprawdź produkty z kategoriami
    const withCategory = await prisma.product.count({
      where: { categoryId: { not: null } }
    });
    
    const withoutCategory = await prisma.product.count({
      where: { categoryId: null }
    });

    console.log(`\nProdukty z kategorią: ${withCategory}`);
    console.log(`Produkty bez kategorii: ${withoutCategory}`);

  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductStatus();
