require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== DIAGNOSTYKA TAGÓW PRODUKTÓW ===\n');

  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, tags: true, status: true },
  });

  console.log(`Łącznie produktów: ${allProducts.length}`);
  console.log(`Aktywnych: ${allProducts.filter(p => p.status === 'ACTIVE').length}`);
  console.log(`Nieaktywnych: ${allProducts.filter(p => p.status !== 'ACTIVE').length}\n`);

  // 1. Produkty z "Paczkomaty i Kurier" BEZ tagu "produkt w paczce"
  const paczkomatyBezPaczki = allProducts.filter(p => 
    p.tags.some(t => t.toLowerCase() === 'paczkomaty i kurier') &&
    !p.tags.some(t => t.toLowerCase().includes('produkt w paczce'))
  );
  
  console.log(`\n=== PROBLEM 1: "Paczkomaty i Kurier" BEZ "produkt w paczce" ===`);
  console.log(`Liczba: ${paczkomatyBezPaczki.length}`);
  if (paczkomatyBezPaczki.length > 0 && paczkomatyBezPaczki.length <= 20) {
    paczkomatyBezPaczki.forEach(p => {
      console.log(`  - ${p.name.substring(0, 50)}...`);
      console.log(`    Tagi: ${p.tags.join(', ')}`);
    });
  }

  // 2. Produkty BEZ żadnego tagu dostawy
  const bezDostawy = allProducts.filter(p => 
    !p.tags.some(t => 
      t.toLowerCase() === 'paczkomaty i kurier' || 
      t.toLowerCase() === 'tylko kurier'
    )
  );
  
  console.log(`\n=== PROBLEM 2: Produkty BEZ tagu dostawy ===`);
  console.log(`Liczba: ${bezDostawy.length}`);
  if (bezDostawy.length > 0) {
    console.log('Przykłady (max 10):');
    bezDostawy.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name.substring(0, 50)}... (status: ${p.status})`);
      console.log(`    Tagi: ${p.tags.join(', ') || '(brak)'}`);
    });
  }

  // 3. Produkty z OBOMA tagami dostawy (niespójność)
  const obaTagiDostawy = allProducts.filter(p => 
    p.tags.some(t => t.toLowerCase() === 'paczkomaty i kurier') &&
    p.tags.some(t => t.toLowerCase() === 'tylko kurier')
  );
  
  console.log(`\n=== PROBLEM 3: Produkty z OBOMA tagami dostawy ===`);
  console.log(`Liczba: ${obaTagiDostawy.length}`);
  if (obaTagiDostawy.length > 0) {
    console.log('Przykłady (max 10):');
    obaTagiDostawy.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name.substring(0, 50)}...`);
      console.log(`    Tagi: ${p.tags.join(', ')}`);
    });
  }

  // 4. Produkty "Tylko kurier" z wieloma tagami "produkt w paczce" (już naprawione, weryfikacja)
  const tylkoKurierZPaczka = allProducts.filter(p => 
    p.tags.some(t => t.toLowerCase() === 'tylko kurier') &&
    p.tags.some(t => t.toLowerCase().includes('produkt w paczce'))
  );
  
  console.log(`\n=== WERYFIKACJA: "Tylko kurier" + "produkt w paczce" ===`);
  console.log(`Liczba: ${tylkoKurierZPaczka.length} (powinno być 0)`);

  // 5. Produkty z tagiem wagi ale bez tagu dostawy
  const wagaBezDostawy = allProducts.filter(p => 
    p.tags.some(t => t.toLowerCase().includes('kg')) &&
    !p.tags.some(t => t.toLowerCase() === 'paczkomaty i kurier' || t.toLowerCase() === 'tylko kurier')
  );
  
  console.log(`\n=== PROBLEM 5: Tag wagi BEZ tagu dostawy ===`);
  console.log(`Liczba: ${wagaBezDostawy.length}`);

  // 6. Sprawdź duplikaty tagów (ten sam tag 2x na produkcie)
  const zDuplikatami = allProducts.filter(p => {
    const lowerTags = p.tags.map(t => t.toLowerCase());
    return lowerTags.length !== new Set(lowerTags).size;
  });
  
  console.log(`\n=== PROBLEM 6: Produkty z duplikatami tagów ===`);
  console.log(`Liczba: ${zDuplikatami.length}`);
  if (zDuplikatami.length > 0) {
    console.log('Przykłady (max 5):');
    zDuplikatami.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name.substring(0, 50)}...`);
      console.log(`    Tagi: ${p.tags.join(', ')}`);
    });
  }

  // 7. Statystyki tagów "produkt w paczce"
  console.log(`\n=== STATYSTYKI "produkt w paczce" ===`);
  for (let i = 1; i <= 5; i++) {
    const count = allProducts.filter(p => 
      p.tags.some(t => t === `produkt w paczce: ${i}`)
    ).length;
    console.log(`  produkt w paczce: ${i} -> ${count} produktów`);
  }

  // 8. Produkty aktywne bez żadnych tagów
  const aktywneBezTagow = allProducts.filter(p => 
    p.status === 'ACTIVE' && p.tags.length === 0
  );
  
  console.log(`\n=== PROBLEM 8: Aktywne produkty BEZ tagów ===`);
  console.log(`Liczba: ${aktywneBezTagow.length}`);

  await prisma.$disconnect();
}

diagnose().catch(e => {
  console.error('Błąd:', e);
  prisma.$disconnect();
});
