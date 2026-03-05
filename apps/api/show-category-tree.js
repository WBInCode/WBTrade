/**
 * Skrypt do wyświetlenia drzewka kategorii z bazy danych
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showCategoryTree() {
  try {
    // Pobierz wszystkie kategorie
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: [
        { order: 'desc' },
        { name: 'asc' }
      ]
    });

    console.log(`\n📂 DRZEWKO KATEGORII (${allCategories.length} kategorii)\n`);
    console.log('=' .repeat(80));

    // Stwórz mapę kategorii
    const categoryMap = new Map();
    allCategories.forEach(cat => categoryMap.set(cat.id, cat));

    // Znajdź kategorie główne (bez rodzica)
    const rootCategories = allCategories
      .filter(c => !c.parentId)
      .sort((a, b) => b.order - a.order || a.name.localeCompare(b.name, 'pl'));

    // Funkcja rekurencyjna do wyświetlania drzewka
    function printTree(parentId, indent = 0) {
      const children = allCategories
        .filter(c => c.parentId === parentId)
        .sort((a, b) => b.order - a.order || a.name.localeCompare(b.name, 'pl'));

      children.forEach((cat, index) => {
        const isLast = index === children.length - 1;
        const prefix = indent === 0 ? '' : '│   '.repeat(indent - 1) + (isLast ? '└── ' : '├── ');
        const icon = cat._count.products > 0 ? '📁' : '📂';
        const productInfo = cat._count.products > 0 ? ` (${cat._count.products} prod.)` : '';
        const orderInfo = cat.order > 0 ? ` [order: ${cat.order}]` : '';
        
        console.log(`${prefix}${icon} ${cat.name}${productInfo}${orderInfo}`);
        
        // Wyświetl dzieci
        printTree(cat.id, indent + 1);
      });
    }

    // Wyświetl kategorie główne i ich dzieci
    rootCategories.forEach((cat, index) => {
      const icon = cat._count.products > 0 ? '📁' : '📂';
      const productInfo = cat._count.products > 0 ? ` (${cat._count.products} prod.)` : '';
      const orderInfo = cat.order > 0 ? ` [order: ${cat.order}]` : '';
      
      console.log(`\n${icon} ${cat.name}${productInfo}${orderInfo}`);
      
      // Wyświetl dzieci tej kategorii głównej
      printTree(cat.id, 1);
    });

    console.log('\n' + '=' .repeat(80));
    
    // Podsumowanie
    const rootCount = rootCategories.length;
    const withProducts = allCategories.filter(c => c._count.products > 0).length;
    const empty = allCategories.filter(c => c._count.products === 0).length;
    const visible = allCategories.filter(c => c.order > 0).length;
    const hidden = allCategories.filter(c => c.order === 0).length;
    
    console.log(`\n📊 PODSUMOWANIE:`);
    console.log(`   Kategorie główne: ${rootCount}`);
    console.log(`   Kategorie z produktami: ${withProducts}`);
    console.log(`   Kategorie puste: ${empty}`);
    console.log(`   Widoczne (order > 0): ${visible}`);
    console.log(`   Ukryte (order = 0): ${hidden}`);

  } catch (error) {
    console.error('Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showCategoryTree();
