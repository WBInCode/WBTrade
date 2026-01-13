/**
 * Sprawdź produkty z zerowymi stanami - przed i po synchronizacji
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Analiza produktów z zerowymi stanami magazynowymi\n');
  console.log('='.repeat(70));
  
  // Produkty z zerowym stanem
  const zeroStockProducts = await prisma.inventory.findMany({
    where: { quantity: 0 },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              baselinkerProductId: true,
              tags: true
            }
          }
        }
      },
      location: true
    }
  });
  
  console.log(`\n📊 Znaleziono ${zeroStockProducts.length} produktów z zerowym stanem (pokazuję 20 najnowszych):\n`);
  
  // Grupuj po czasie aktualizacji
  const now = new Date();
  const recentlyUpdated = [];
  const olderUpdates = [];
  
  zeroStockProducts.forEach(inv => {
    const minutesAgo = (now - inv.updatedAt) / 1000 / 60;
    if (minutesAgo < 5) {
      recentlyUpdated.push(inv);
    } else {
      olderUpdates.push(inv);
    }
  });
  
  if (recentlyUpdated.length > 0) {
    console.log(`🔴 Zaktualizowane w ciągu ostatnich 5 minut (${recentlyUpdated.length}):\n`);
    recentlyUpdated.forEach((inv, i) => {
      const warehouse = inv.variant.product.baselinkerProductId?.includes('leker-') ? 'LEKER' : 'IKONKA';
      console.log(`${i + 1}. [${warehouse}] ${inv.variant.product.name}`);
      console.log(`   SKU: ${inv.variant.product.sku}`);
      console.log(`   Baselinker ID: ${inv.variant.product.baselinkerProductId}`);
      console.log(`   Stan: ${inv.quantity} | Zaktualizowano: ${inv.updatedAt.toLocaleString('pl-PL')}\n`);
    });
  }
  
  if (olderUpdates.length > 0) {
    console.log(`\n⚪ Starsze aktualizacje (${olderUpdates.length}):\n`);
    olderUpdates.slice(0, 5).forEach((inv, i) => {
      const warehouse = inv.variant.product.baselinkerProductId?.includes('leker-') ? 'LEKER' : 'IKONKA';
      console.log(`${i + 1}. [${warehouse}] ${inv.variant.product.name}`);
      console.log(`   SKU: ${inv.variant.product.sku}`);
      console.log(`   Zaktualizowano: ${inv.updatedAt.toLocaleString('pl-PL')}\n`);
    });
  }
  
  // Statystyki ogólne
  console.log('='.repeat(70));
  console.log('\n📈 Statystyki stanów zerowych:\n');
  
  const totalZero = await prisma.inventory.count({
    where: { quantity: 0 }
  });
  
  const totalInventory = await prisma.inventory.count();
  const percentage = ((totalZero / totalInventory) * 100).toFixed(1);
  
  console.log(`📦 Łącznie produktów z zerowym stanem: ${totalZero}`);
  console.log(`📊 Łącznie pozycji w magazynie: ${totalInventory}`);
  console.log(`📉 Procent produktów bez stanu: ${percentage}%`);
  
  // Sprawdź ile produktów z każdego magazynu ma zero stanów
  const zeroByWarehouse = await prisma.inventory.findMany({
    where: { quantity: 0 },
    include: {
      variant: {
        include: {
          product: {
            select: {
              baselinkerProductId: true
            }
          }
        }
      }
    }
  });
  
  const lekerZero = zeroByWarehouse.filter(inv => 
    inv.variant.product.baselinkerProductId?.includes('leker-')
  ).length;
  
  const ikonkaZero = zeroByWarehouse.filter(inv => 
    !inv.variant.product.baselinkerProductId?.includes('leker-')
  ).length;
  
  console.log(`\n🏪 LEKER - produkty z zerowym stanem: ${lekerZero}`);
  console.log(`🏬 IKONKA - produkty z zerowym stanem: ${ikonkaZero}`);
  
  // Produkty z najwyższym stanem zaktualizowane ostatnio
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Przykłady produktów z wysokim stanem (zaktualizowane ostatnio):\n');
  
  const highStock = await prisma.inventory.findMany({
    where: { 
      quantity: { gt: 10 }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              baselinkerProductId: true
            }
          }
        }
      }
    }
  });
  
  highStock.forEach((inv, i) => {
    const warehouse = inv.variant.product.baselinkerProductId?.includes('leker-') ? 'LEKER' : 'IKONKA';
    console.log(`${i + 1}. [${warehouse}] ${inv.variant.product.name}`);
    console.log(`   SKU: ${inv.variant.product.sku} | Stan: ${inv.quantity} szt.`);
    console.log(`   Zaktualizowano: ${inv.updatedAt.toLocaleString('pl-PL')}\n`);
  });
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Błąd:', err);
  await prisma.$disconnect();
  process.exit(1);
});
