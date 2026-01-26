/**
 * Skrypt do resetu kategorii - usuwa wszystkie i tworzy nowe
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Definicja nowych kategorii
const CATEGORIES = [
  {
    name: 'Elektronika',
    slug: 'elektronika',
    subcategories: [
      { name: 'Akcesoria Komputerowe', slug: 'akcesoria-komputerowe' },
      { name: 'Etui i akcesoria GSM', slug: 'etui-i-akcesoria-gsm' },
      { name: 'Smartfony i telefony', slug: 'smartfony-i-telefony' },
      { name: 'Smartwatche', slug: 'smartwatche' },
      { name: 'Słuchawki', slug: 'sluchawki' },
    ]
  },
  {
    name: 'Sport',
    slug: 'sport',
    subcategories: [
      { name: 'Akcesoria sportowe', slug: 'akcesoria-sportowe' },
      { name: 'Rekreacja', slug: 'rekreacja' },
      { name: 'Turystyka', slug: 'turystyka' },
    ]
  },
  {
    name: 'Zdrowie i uroda',
    slug: 'zdrowie-i-uroda',
    subcategories: []
  },
  {
    name: 'Dom i ogród',
    slug: 'dom-i-ogrod',
    subcategories: [
      { name: 'Akcesoria dla zwierząt', slug: 'akcesoria-dla-zwierzat' },
      { name: 'Akcesoria domowe', slug: 'akcesoria-domowe' },
      { name: 'Domowe AGD', slug: 'domowe-agd' },
      { name: 'Ogród', slug: 'ogrod' },
      { name: 'Oświetlenie', slug: 'oswietlenie' },
      { name: 'Wyposażenie wnętrz', slug: 'wyposazenie-wnetrz' },
    ]
  },
  {
    name: 'Motoryzacja',
    slug: 'motoryzacja',
    subcategories: [
      { name: 'Akcesoria samochodowe', slug: 'akcesoria-samochodowe' },
      { name: 'Folie samochodowe', slug: 'folie-samochodowe' },
    ]
  },
  {
    name: 'Dziecko',
    slug: 'dziecko',
    subcategories: [
      { name: 'Kostiumy i przebrania', slug: 'kostiumy-i-przebrania' },
      { name: 'Zabawki', slug: 'zabawki' },
      { name: 'Pojazdy dla dzieci', slug: 'pojazdy-dla-dzieci' },
      { name: 'Artykuły dla dzieci', slug: 'artykuly-dla-dzieci' },
      { name: 'Artykuły plastyczne', slug: 'artykuly-plastyczne' },
      { name: 'Artykuły szkolne', slug: 'artykuly-szkolne' },
    ]
  },
  {
    name: 'Biurowe i papiernicze',
    slug: 'biurowe-i-papiernicze',
    subcategories: []
  },
  {
    name: 'Gastronomiczne',
    slug: 'gastronomiczne',
    subcategories: [
      { name: 'Naczynia i zastawa', slug: 'naczynia-i-zastawa' },
    ]
  },
];

async function resetCategories() {
  console.log('\n============================================');
  console.log('  RESET KATEGORII');
  console.log('============================================\n');

  try {
    // KROK 1: Usuń przypisania produktów do kategorii
    console.log('=== KROK 1: Usuwanie przypisań produktów ===\n');
    const updateResult = await prisma.product.updateMany({
      where: { categoryId: { not: null } },
      data: { categoryId: null }
    });
    console.log(`  ✓ Usunięto przypisania z ${updateResult.count} produktów\n`);

    // KROK 2: Usuń wszystkie kategorie
    console.log('=== KROK 2: Usuwanie wszystkich kategorii ===\n');
    const deleteResult = await prisma.category.deleteMany({});
    console.log(`  ✓ Usunięto ${deleteResult.count} kategorii\n`);

    // KROK 3: Tworzenie nowych kategorii
    console.log('=== KROK 3: Tworzenie nowych kategorii ===\n');
    
    let order = 0;
    for (const cat of CATEGORIES) {
      // Tworzenie kategorii głównej
      const mainCategory = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          order: order++,
          isActive: true,
          parentId: null
        }
      });
      console.log(`  ✓ Utworzono: ${cat.name}`);

      // Tworzenie podkategorii
      let subOrder = 0;
      for (const sub of cat.subcategories) {
        await prisma.category.create({
          data: {
            name: sub.name,
            slug: sub.slug,
            order: subOrder++,
            isActive: true,
            parentId: mainCategory.id
          }
        });
        console.log(`    ✓ Podkategoria: ${sub.name}`);
      }
    }

    // Podsumowanie
    const totalCategories = await prisma.category.count();
    const mainCategories = await prisma.category.count({ where: { parentId: null } });
    const subCategories = await prisma.category.count({ where: { parentId: { not: null } } });

    console.log('\n============================================');
    console.log('  PODSUMOWANIE');
    console.log('============================================\n');
    console.log(`  Kategorie główne: ${mainCategories}`);
    console.log(`  Podkategorie: ${subCategories}`);
    console.log(`  Razem: ${totalCategories}`);
    console.log('\n✅ Reset kategorii zakończony pomyślnie!\n');

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetCategories();
