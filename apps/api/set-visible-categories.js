const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setVisibleCategories() {
  console.log('=== USTAWIENIE WIDOCZNOŚCI KATEGORII ===\n');
  
  try {
    // Pobierz kategorie główne z produktami, posortowane po liczbie produktów
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
        order: 0  // tylko te które są ukryte
      },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        _count: {
          products: 'desc'
        }
      }
    });
    
    console.log(`Znaleziono ${categories.length} ukrytych kategorii głównych\n`);
    
    // Pokaż top 50 kategorii z największą liczbą produktów
    console.log('TOP 50 UKRYTYCH KATEGORII (według liczby produktów):\n');
    const top50 = categories.slice(0, 50);
    
    top50.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name} - ${cat._count.products} produktów`);
    });
    
    console.log('\n\n=== OPCJE ===\n');
    console.log('1. Możesz ręcznie wybrać które kategorie ustawić jako widoczne');
    console.log('2. Lub automatycznie ustawić top N kategorii jako widoczne');
    console.log('');
    console.log('Przykład ustawienia top 30 jako widoczne:');
    console.log('');
    console.log('Uruchom:');
    console.log('  node set-visible-categories.js --top 30');
    console.log('');
    console.log('Lub ustaw konkretne kategorie:');
    console.log('  node set-visible-categories.js --categories "hp-etui-case-szkla-ochronne-2623738,hp-przewody-usb-2623732"');
    
    // Sprawdź argumenty
    const args = process.argv.slice(2);
    
    if (args.includes('--top')) {
      const topIndex = args.indexOf('--top');
      const topN = parseInt(args[topIndex + 1]);
      
      if (isNaN(topN)) {
        console.log('\n❌ Błędna liczba!');
        return;
      }
      
      console.log(`\n\nUstawianie top ${topN} kategorii jako widoczne...\n`);
      
      const categoriesToShow = categories.slice(0, topN);
      let order = 100; // Zacznij od 100 żeby nie kolidować z istniejącymi
      
      for (const cat of categoriesToShow) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { order: order++ }
        });
        console.log(`✓ ${cat.name} - order: ${order - 1}`);
      }
      
      console.log(`\n✅ Ustawiono ${topN} kategorii jako widoczne!`);
      
      // Pokaż sumę produktów
      const totalProducts = categoriesToShow.reduce((sum, cat) => sum + cat._count.products, 0);
      console.log(`📊 Razem produktów w widocznych kategoriach: ${totalProducts}`);
    }
    
    if (args.includes('--categories')) {
      const catIndex = args.indexOf('--categories');
      const slugs = args[catIndex + 1].split(',');
      
      console.log(`\n\nUstawianie kategorii: ${slugs.join(', ')}\n`);
      
      let order = 100;
      for (const slug of slugs) {
        const cat = await prisma.category.findUnique({
          where: { slug: slug.trim() },
          include: {
            _count: {
              select: { products: true }
            }
          }
        });
        
        if (cat) {
          await prisma.category.update({
            where: { id: cat.id },
            data: { order: order++ }
          });
          console.log(`✓ ${cat.name} - ${cat._count.products} produktów`);
        } else {
          console.log(`❌ Nie znaleziono kategorii: ${slug}`);
        }
      }
      
      console.log(`\n✅ Zakończono!`);
    }
    
    if (args.includes('--all')) {
      console.log('\n\nUstawianie WSZYSTKICH kategorii z produktami jako widoczne...\n');
      
      const withProducts = categories.filter(c => c._count.products > 0);
      let order = 100;
      
      for (const cat of withProducts) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { order: order++ }
        });
        console.log(`✓ ${cat.name} - ${cat._count.products} produktów`);
      }
      
      const totalProducts = withProducts.reduce((sum, cat) => sum + cat._count.products, 0);
      console.log(`\n✅ Ustawiono ${withProducts.length} kategorii jako widoczne!`);
      console.log(`📊 Razem produktów: ${totalProducts}`);
    }
    
  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setVisibleCategories();
