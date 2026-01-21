require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { tags: { isEmpty: false } },
    select: { id: true, name: true, sku: true, tags: true }
  });
  
  const withWeightTags = products.filter(p => 
    p.tags && p.tags.some(t => /do\s*\d+[\.,]?\d*\s*kg/i.test(t))
  );
  
  console.log('=== ANALIZA TAGÓW WAGA vs TYLKO KURIER ===\n');
  console.log('Produktów z tagami waga: ' + withWeightTags.length);
  
  // Sprawdź czy mają też 'Tylko kurier'
  const withBoth = withWeightTags.filter(p => 
    p.tags.some(t => /tylko\s*kurier/i.test(t))
  );
  const withoutCourier = withWeightTags.filter(p => 
    !p.tags.some(t => /tylko\s*kurier/i.test(t))
  );
  
  console.log('Z tagiem "Tylko kurier": ' + withBoth.length);
  console.log('BEZ tagu "Tylko kurier": ' + withoutCourier.length);
  
  // Grupuj po wadze
  const byWeight = {};
  withoutCourier.forEach(p => {
    const weightTag = p.tags.find(t => /do\s*\d+[\.,]?\d*\s*kg/i.test(t));
    if (!byWeight[weightTag]) byWeight[weightTag] = [];
    byWeight[weightTag].push(p);
  });
  
  console.log('\n=== PRODUKTY BEZ "TYLKO KURIER" - WG WAGI ===');
  Object.entries(byWeight).sort((a,b) => b[1].length - a[1].length).forEach(([tag, prods]) => {
    console.log(`  ${tag}: ${prods.length} produktów`);
  });
  
  // Grupuj po hurtowni
  const byWholesaler = {};
  withoutCourier.forEach(p => {
    const ws = p.tags.find(t => /^(Ikonka|BTP|HP|Leker|Gastro|Horeca|Hurtownia|Forcetop)/i.test(t)) || 'brak';
    if (!byWholesaler[ws]) byWholesaler[ws] = [];
    byWholesaler[ws].push(p);
  });
  
  console.log('\n=== WG HURTOWNI ===');
  Object.entries(byWholesaler).sort((a,b) => b[1].length - a[1].length).forEach(([ws, prods]) => {
    console.log(`  ${ws}: ${prods.length} produktów`);
  });
  
  if (withoutCourier.length > 0) {
    console.log('\n=== PRZYKŁADY (pierwsze 10) ===\n');
    withoutCourier.slice(0, 10).forEach(p => {
      console.log('SKU: ' + p.sku);
      console.log('Tagi: ' + p.tags.join(', '));
      console.log('---');
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
