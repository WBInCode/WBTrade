const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Znajdź Elektronika
  const elektronika = await prisma.category.findFirst({
    where: { name: { contains: 'Elektronika' }, parentId: null },
    include: { 
      children: { 
        include: { 
          _count: { select: { products: { where: { price: { gt: 0 } } } } },
          children: { include: { _count: { select: { products: { where: { price: { gt: 0 } } } } } } }
        } 
      },
      _count: { select: { products: { where: { price: { gt: 0 } } } } }
    }
  });
  
  console.log('=== ELEKTRONIKA ===');
  console.log('ID:', elektronika?.id);
  console.log('Slug:', elektronika?.slug);
  console.log('ParentId:', elektronika?.parentId);
  console.log('Direct products:', elektronika?._count?.products);
  console.log('');
  
  // Pokaż podkategorie
  let total = elektronika?._count?.products || 0;
  console.log('=== PODKATEGORIE ELEKTRONIKI ===');
  for (const child of (elektronika?.children || [])) {
    let childTotal = child._count.products;
    for (const gc of child.children) {
      childTotal += gc._count.products;
    }
    total += childTotal;
    console.log(child.name + ': ' + childTotal + ' (direct: ' + child._count.products + ', grandchildren: ' + (childTotal - child._count.products) + ')');
  }
  console.log('');
  console.log('SUMA w Elektronika:', total);
  
  // Znajdź 'Etui i akcesoria GSM' - wszystkie kategorie z "Etui"
  console.log('');
  console.log('=== SZUKAM ETUI ===');
  const etuiCats = await prisma.category.findMany({
    where: { name: { contains: 'Etui' } },
    include: { 
      parent: true,
      _count: { select: { products: { where: { price: { gt: 0 } } } } }
    }
  });
  
  for (const etui of etuiCats) {
    console.log('');
    console.log('Name:', etui.name);
    console.log('ID:', etui.id);
    console.log('Slug:', etui.slug);
    console.log('ParentId:', etui.parentId);
    console.log('Parent name:', etui.parent?.name);
    console.log('Direct products:', etui._count?.products);
  }
  
  // Sprawdź czy Etui i akcesoria GSM jest pod Elektronika
  console.log('');
  console.log('=== SPRAWDZAM STRUKTURĘ ===');
  const etuiGSM = await prisma.category.findFirst({
    where: { slug: { contains: 'etui' } },
    include: { parent: { include: { parent: true } } }
  });
  
  if (etuiGSM) {
    console.log('Kategoria:', etuiGSM.name);
    console.log('Parent:', etuiGSM.parent?.name);
    console.log('Grandparent:', etuiGSM.parent?.parent?.name);
  }
  
  await prisma.$disconnect();
}
check();
