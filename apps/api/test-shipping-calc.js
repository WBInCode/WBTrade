const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Symulacja logiki kalkulatora
function getPaczkomatLimit(tags) {
  const PACZKOMAT_LIMIT = /produkt\s*w\s*paczce:\s*(\d+)|(\d+)\s*produkt(?:y|ów)?\s*w\s*paczce/i;
  for (const tag of tags) {
    const match = tag.match(PACZKOMAT_LIMIT);
    if (match) {
      const limit = parseInt(match[1] || match[2], 10);
      if (!isNaN(limit) && limit > 0) {
        return limit;
      }
    }
  }
  return 1; // Default: each product = 1 package
}

async function main() {
  // Pobierz produkty z koszyka
  const marble = await prisma.product.findFirst({
    where: { name: { contains: 'Marble żelowe etui', mode: 'insensitive' } },
    select: { id: true, name: true, tags: true, price: true }
  });
  
  const organizer = await prisma.product.findFirst({
    where: { name: { contains: 'Uchwyt organizer do kabli', mode: 'insensitive' } },
    select: { id: true, name: true, tags: true, price: true }
  });
  
  console.log('=== Produkty z koszyka ===\n');
  
  // Symulacja: 3x Marble, 5x Organizer
  const cart = [
    { product: marble, quantity: 3 },
    { product: organizer, quantity: 5 },
  ];
  
  let totalFraction = 0;
  
  for (const item of cart) {
    const p = item.product;
    const limit = getPaczkomatLimit(p.tags);
    const fractionPerItem = 1 / limit;
    const totalForItem = fractionPerItem * item.quantity;
    
    console.log(`${p.name}`);
    console.log(`  Tagi: ${p.tags.filter(t => t.includes('paczce') || t.includes('Paczkomaty') || t.includes('kurier')).join(', ') || 'brak tagów dostawy'}`);
    console.log(`  Ilość: ${item.quantity}`);
    console.log(`  Limit (z tagu): ${limit} szt/paczka`);
    console.log(`  Ułamek za sztukę: 1/${limit} = ${fractionPerItem.toFixed(4)}`);
    console.log(`  Ułamek całkowity: ${item.quantity} × ${fractionPerItem.toFixed(4)} = ${totalForItem.toFixed(4)}`);
    console.log('');
    
    totalFraction += totalForItem;
  }
  
  const paczkomatPackages = Math.ceil(totalFraction);
  
  console.log('=== PODSUMOWANIE ===');
  console.log(`Suma ułamków: ${totalFraction.toFixed(4)}`);
  console.log(`Liczba paczek paczkomatowych: ceil(${totalFraction.toFixed(4)}) = ${paczkomatPackages}`);
  console.log(`\nCena paczkomat: ${paczkomatPackages} × 15.99 zł = ${(paczkomatPackages * 15.99).toFixed(2)} zł`);
  console.log(`Cena kurier InPost: ${paczkomatPackages} × 19.99 zł = ${(paczkomatPackages * 19.99).toFixed(2)} zł`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
