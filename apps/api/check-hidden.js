const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];
const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce|produkty?\s*w\s*paczce/i;

async function check() {
  // Pobierz produkty z tagiem paczkomat które były widoczne na stronie
  // (stan > 0, cena > 0, status ACTIVE, kategoria z Baselinker)
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      price: { gt: 0 },
      OR: PACZKOMAT_TAGS.map(tag => ({ tags: { has: tag } })),
      // Ma kategorię z Baselinker
      category: {
        baselinkerCategoryId: { not: null }
      },
      // Ma stan > 0
      variants: {
        some: {
          inventory: {
            some: {
              quantity: { gt: 0 }
            }
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      tags: true,
      sku: true
    }
  });
  
  console.log('Produkty z tagiem "Paczkomaty i Kurier" które BYŁY widoczne:', products.length);
  
  // Sprawdź które nie mają tagu produkt w paczce
  const hidden = products.filter(p => {
    const hasPackageTag = p.tags.some(t => PACKAGE_LIMIT_PATTERN.test(t));
    return !hasPackageTag;
  });
  
  console.log('TERAZ UKRYTE (brak tagu "produkt w paczce"):', hidden.length);
  console.log('');
  console.log('Lista nowo ukrytych produktów:');
  hidden.slice(0, 20).forEach(p => {
    console.log('- ' + p.name.substring(0, 60) + ' (SKU: ' + p.sku + ')');
  });
  if (hidden.length > 20) {
    console.log('... i ' + (hidden.length - 20) + ' więcej');
  }
  
  await prisma.$disconnect();
}

check();
