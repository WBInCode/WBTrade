/**
 * Sprawdzenie produktów w kategorii "Inne"
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Znajdź kategorię Inne
  const cat = await prisma.category.findFirst({ where: { slug: 'inne' } });
  if (!cat) {
    console.log('Brak kategorii Inne');
    return;
  }
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              PRODUKTY W KATEGORII "INNE"                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Kategoria: ${cat.name} (ID: ${cat.id})`);
  console.log(`Status: ${cat.isActive ? '✅ aktywna' : '❌ ukryta'}\n`);
  
  // Pobierz produkty z tej kategorii
  const products = await prisma.product.findMany({
    where: { categoryId: cat.id },
    select: { 
      name: true, 
      baselinkerProductId: true, 
      tags: true,
      status: true,
      variants: {
        select: {
          inventory: { select: { quantity: true } }
        }
      }
    }
  });
  
  console.log(`Produktów w kategorii: ${products.length}\n`);
  
  // Statystyki wg hurtowni
  const byWarehouse = { HP: 0, BTP: 0, Leker: 0, Ikonka: 0, inne: 0 };
  
  // Statystyki wg tagów
  const tagStats = {};
  
  for (const p of products) {
    const id = p.baselinkerProductId || '';
    if (id.startsWith('hp-')) byWarehouse.HP++;
    else if (id.startsWith('btp-')) byWarehouse.BTP++;
    else if (id.startsWith('leker-')) byWarehouse.Leker++;
    else if (/^\d+$/.test(id)) byWarehouse.Ikonka++;
    else byWarehouse.inne++;
    
    for (const tag of (p.tags || [])) {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    }
  }
  
  console.log('=== PODZIAŁ WG HURTOWNI ===');
  for (const [name, count] of Object.entries(byWarehouse).sort((a, b) => b[1] - a[1])) {
    if (count > 0) console.log(`  ${name}: ${count}`);
  }
  
  console.log('\n=== NAJCZĘSTSZE TAGI ===');
  const sortedTags = Object.entries(tagStats).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [tag, count] of sortedTags) {
    console.log(`  ${tag}: ${count}`);
  }
  
  console.log('\n=== PRZYKŁADOWE PRODUKTY (50) ===\n');
  
  for (const p of products.slice(0, 50)) {
    const stock = p.variants.reduce((s, v) => s + v.inventory.reduce((a, i) => a + i.quantity, 0), 0);
    const id = p.baselinkerProductId || '';
    const warehouse = id.startsWith('hp-') ? 'HP' : 
                      id.startsWith('btp-') ? 'BTP' :
                      id.startsWith('leker-') ? 'Leker' :
                      /^\d+$/.test(id) ? 'Ikonka' : 'inne';
    
    console.log('─'.repeat(70));
    console.log(`📦 ${p.name.substring(0, 65)}`);
    console.log(`   Hurtownia: ${warehouse} | Stan: ${stock} | Status: ${p.status}`);
    console.log(`   Tagi: ${JSON.stringify(p.tags)}`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
