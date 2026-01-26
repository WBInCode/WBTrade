/**
 * Raport ilościowy produktów - uproszczony
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              RAPORT ILOŚCIOWY PRODUKTÓW                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Pobierz wszystkie produkty z wariantami i stanami
  const allProducts = await prisma.product.findMany({
    select: { 
      id: true,
      status: true,
      baselinkerProductId: true,
      categoryId: true,
      price: true,
      variants: {
        select: {
          inventory: {
            select: { quantity: true }
          }
        }
      }
    }
  });

  // Oblicz stan dla każdego produktu
  const productsWithStock = allProducts.map(p => {
    const stock = p.variants.reduce((sum, v) => {
      return sum + v.inventory.reduce((s, inv) => s + inv.quantity, 0);
    }, 0);
    return { ...p, stock };
  });

  const total = productsWithStock.length;
  const active = productsWithStock.filter(p => p.status === 'ACTIVE').length;
  const draft = productsWithStock.filter(p => p.status === 'DRAFT').length;
  const archived = productsWithStock.filter(p => p.status === 'ARCHIVED').length;
  const inStock = productsWithStock.filter(p => p.stock > 0).length;
  const noStock = productsWithStock.filter(p => p.stock <= 0).length;
  const visible = productsWithStock.filter(p => p.status === 'ACTIVE' && p.stock > 0).length;
  const activeNoStock = productsWithStock.filter(p => p.status === 'ACTIVE' && p.stock <= 0).length;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    PODSTAWOWE STATYSTYKI');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  📦 ŁĄCZNIE W BAZIE:                    ${total.toLocaleString()}`);
  console.log(`  ✅ ACTIVE:                             ${active.toLocaleString()}`);
  console.log(`  📝 DRAFT:                              ${draft.toLocaleString()}`);
  console.log(`  📁 ARCHIVED:                           ${archived.toLocaleString()}`);
  console.log(`  📈 Ze stanem > 0:                      ${inStock.toLocaleString()}`);
  console.log(`  📉 Ze stanem = 0:                      ${noStock.toLocaleString()}`);
  console.log(`  🌐 WIDOCZNE NA STRONIE:                ${visible.toLocaleString()}`);
  console.log(`     (ACTIVE + stan > 0)`);
  console.log(`  ⚠️  ACTIVE bez stanu:                   ${activeNoStock.toLocaleString()}`);

  // === PODZIAŁ WG HURTOWNI ===
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    PODZIAŁ WG HURTOWNI');
  console.log('═══════════════════════════════════════════════════════════════');

  const warehouseStats = {
    'Ikonka': { total: 0, active: 0, inStock: 0, visible: 0 },
    'HP': { total: 0, active: 0, inStock: 0, visible: 0 },
    'Leker': { total: 0, active: 0, inStock: 0, visible: 0 },
    'BTP': { total: 0, active: 0, inStock: 0, visible: 0 },
    'Inne': { total: 0, active: 0, inStock: 0, visible: 0 },
  };

  for (const p of productsWithStock) {
    const id = p.baselinkerProductId || '';
    let warehouse = 'Inne';
    
    if (id.startsWith('hp-')) warehouse = 'HP';
    else if (id.startsWith('ikonka-') || /^\d+$/.test(id)) warehouse = 'Ikonka';
    else if (id.startsWith('leker-')) warehouse = 'Leker';
    else if (id.startsWith('btp-')) warehouse = 'BTP';

    warehouseStats[warehouse].total++;
    if (p.status === 'ACTIVE') warehouseStats[warehouse].active++;
    if (p.stock > 0) warehouseStats[warehouse].inStock++;
    if (p.status === 'ACTIVE' && p.stock > 0) warehouseStats[warehouse].visible++;
  }

  console.log('  Hurtownia       | Łącznie |  ACTIVE | Ze stanem | Widoczne');
  console.log('  ─────────────────────────────────────────────────────────────');
  for (const [name, stats] of Object.entries(warehouseStats)) {
    if (stats.total > 0) {
      console.log(`  ${name.padEnd(15)} | ${String(stats.total).padStart(7)} | ${String(stats.active).padStart(7)} | ${String(stats.inStock).padStart(9)} | ${String(stats.visible).padStart(8)}`);
    }
  }

  // === PODZIAŁ WG KATEGORII ===
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    PODZIAŁ WG KATEGORII');
  console.log('═══════════════════════════════════════════════════════════════');

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: { select: { products: true } }
    },
    orderBy: { products: { _count: 'desc' } }
  });

  // Oblicz widoczne per kategoria
  const visibleByCat = {};
  for (const p of productsWithStock) {
    if (p.categoryId && p.status === 'ACTIVE' && p.stock > 0) {
      visibleByCat[p.categoryId] = (visibleByCat[p.categoryId] || 0) + 1;
    }
  }

  console.log('  Kategoria                      | Łącznie | Widoczne | Status');
  console.log('  ─────────────────────────────────────────────────────────────');
  
  for (const cat of categories) {
    const visibleCount = visibleByCat[cat.id] || 0;
    const status = cat.isActive ? '✅ aktywna' : '❌ ukryta';
    console.log(`  ${cat.name.substring(0, 28).padEnd(28)} | ${String(cat._count.products).padStart(7)} | ${String(visibleCount).padStart(8)} | ${status}`);
  }

  // === PRODUKTY BEZ KATEGORII ===
  const noCategory = productsWithStock.filter(p => !p.categoryId).length;
  console.log(`\n  ⚠️  Produkty bez kategorii: ${noCategory}`);

  // === STATYSTYKI CENOWE ===
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    STATYSTYKI CENOWE');
  console.log('═══════════════════════════════════════════════════════════════');

  const visibleProducts = productsWithStock.filter(p => p.status === 'ACTIVE' && p.stock > 0);
  const prices = visibleProducts.map(p => parseFloat(p.price)).filter(x => !isNaN(x));
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  console.log(`  Średnia cena:     ${avgPrice.toFixed(2)} PLN`);
  console.log(`  Min cena:         ${minPrice.toFixed(2)} PLN`);
  console.log(`  Max cena:         ${maxPrice.toFixed(2)} PLN`);

  // === STATYSTYKI STANÓW ===
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    STATYSTYKI STANÓW');
  console.log('═══════════════════════════════════════════════════════════════');

  const productsInStock = productsWithStock.filter(p => p.stock > 0);
  const totalStock = productsInStock.reduce((sum, p) => sum + p.stock, 0);
  const avgStock = productsInStock.length > 0 ? totalStock / productsInStock.length : 0;

  const lowStock = productsWithStock.filter(p => p.stock > 0 && p.stock <= 5 && p.status === 'ACTIVE').length;
  const medStock = productsWithStock.filter(p => p.stock > 5 && p.stock <= 20 && p.status === 'ACTIVE').length;
  const highStock = productsWithStock.filter(p => p.stock > 20 && p.status === 'ACTIVE').length;

  console.log(`  Łączny stan magazynowy:  ${totalStock.toLocaleString()} szt.`);
  console.log(`  Średni stan:             ${avgStock.toFixed(1)} szt.`);
  console.log(`  Niski stan (1-5):        ${lowStock.toLocaleString()} produktów`);
  console.log(`  Średni stan (6-20):      ${medStock.toLocaleString()} produktów`);
  console.log(`  Wysoki stan (>20):       ${highStock.toLocaleString()} produktów`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Błąd:', err);
  await prisma.$disconnect();
});
