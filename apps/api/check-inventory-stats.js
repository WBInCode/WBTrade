const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📊 Statystyki stanów magazynowych:\n');

  // Łączna liczba pozycji inventory
  const totalInventory = await prisma.inventory.count();
  
  // Suma wszystkich stanów
  const totalStock = await prisma.inventory.aggregate({
    _sum: { quantity: true }
  });

  // Produkty z zerowymi stanami
  const zeroStock = await prisma.inventory.count({
    where: { quantity: 0 }
  });

  // Produkty z dodatnimi stanami
  const positiveStock = await prisma.inventory.count({
    where: { quantity: { gt: 0 } }
  });

  // Średni stan
  const avgStock = await prisma.inventory.aggregate({
    _avg: { quantity: true }
  });

  // Top 10 produktów z największymi stanami
  const topStock = await prisma.inventory.findMany({
    where: { quantity: { gt: 0 } },
    orderBy: { quantity: 'desc' },
    take: 10,
    include: {
      variant: {
        include: {
          product: {
            select: { name: true, sku: true }
          }
        }
      }
    }
  });

  // Statystyki per magazyn
  const ikonkaInventory = await prisma.inventory.count({
    where: {
      variant: {
        product: {
          AND: [
            { baselinkerProductId: { not: { startsWith: 'leker-' } } },
            { baselinkerProductId: { not: { startsWith: 'btp-' } } },
            { baselinkerProductId: { not: { startsWith: 'hp-' } } }
          ]
        }
      }
    }
  });

  const lekerInventory = await prisma.inventory.count({
    where: {
      variant: {
        product: {
          baselinkerProductId: { startsWith: 'leker-' }
        }
      }
    }
  });

  const btpInventory = await prisma.inventory.count({
    where: {
      variant: {
        product: {
          baselinkerProductId: { startsWith: 'btp-' }
        }
      }
    }
  });

  const hpInventory = await prisma.inventory.count({
    where: {
      variant: {
        product: {
          baselinkerProductId: { startsWith: 'hp-' }
        }
      }
    }
  });

  console.log(`📦 Łączna liczba pozycji inventory: ${totalInventory.toLocaleString('pl-PL')}`);
  console.log(`📊 Łączny stan magazynowy: ${totalStock._sum.quantity?.toLocaleString('pl-PL') || 0}`);
  console.log(`📈 Średni stan: ${Math.round(avgStock._avg.quantity || 0)}`);
  console.log(`\n🔴 Produkty z zerowymi stanami: ${zeroStock.toLocaleString('pl-PL')}`);
  console.log(`🟢 Produkty z dodatnimi stanami: ${positiveStock.toLocaleString('pl-PL')}`);
  
  console.log(`\n📍 Inventory per magazyn:`);
  console.log(`   Ikonka: ${ikonkaInventory.toLocaleString('pl-PL')} pozycji`);
  console.log(`   Leker:  ${lekerInventory.toLocaleString('pl-PL')} pozycji`);
  console.log(`   BTP:    ${btpInventory.toLocaleString('pl-PL')} pozycji`);
  console.log(`   HP:     ${hpInventory.toLocaleString('pl-PL')} pozycji`);

  console.log(`\n🏆 Top 10 produktów z największymi stanami:`);
  topStock.forEach((inv, idx) => {
    console.log(`   ${idx + 1}. ${inv.variant.product.name.substring(0, 50)} - ${inv.quantity} szt.`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
