require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PRODUKTY Z TAGAMI WAGA ===\n');
  
  const products = await prisma.product.findMany({
    where: { tags: { isEmpty: false } },
    select: { id: true, name: true, sku: true, tags: true, baselinkerProductId: true }
  });
  
  // Filtruj produkty z tagami waga/kg
  const withWeightTags = products.filter(p => 
    p.tags && p.tags.some(t => 
      t.toLowerCase().includes('waga') || 
      /do\s*\d+[\.,]?\d*\s*kg/i.test(t) ||
      /^\d+[\.,]?\d*\s*kg$/i.test(t)
    )
  );
  
  console.log('Znaleziono: ' + withWeightTags.length + ' produktów\n');
  
  // Grupuj po typie tagu
  const tagGroups = {};
  withWeightTags.forEach(p => {
    p.tags.forEach(t => {
      if (t.toLowerCase().includes('waga') || /do\s*\d+[\.,]?\d*\s*kg/i.test(t) || /^\d+[\.,]?\d*\s*kg$/i.test(t)) {
        if (!tagGroups[t]) tagGroups[t] = [];
        tagGroups[t].push(p);
      }
    });
  });
  
  console.log('=== TAGI WAGA (unikalne, posortowane wg ilości) ===\n');
  Object.entries(tagGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([tag, prods]) => {
      console.log(`"${tag}": ${prods.length} produktów`);
    });
  
  console.log('\n=== PRZYKŁADY PRODUKTÓW (pierwsze 20) ===\n');
  withWeightTags.slice(0, 20).forEach(p => {
    const weightTags = p.tags.filter(t => 
      t.toLowerCase().includes('waga') || 
      /do\s*\d+[\.,]?\d*\s*kg/i.test(t) ||
      /^\d+[\.,]?\d*\s*kg$/i.test(t)
    );
    console.log(`SKU: ${p.sku}`);
    console.log(`Nazwa: ${p.name.substring(0, 70)}...`);
    console.log(`Tagi waga: ${weightTags.join(', ')}`);
    console.log(`Wszystkie tagi: ${p.tags.join(', ')}`);
    console.log('---');
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
