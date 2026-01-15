import { PrismaClient, ProductStatus } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function addTestProduct() {
  try {
    console.log('🔍 Pobieranie pierwszej kategorii...');
    
    // Pobierz pierwszą dostępną kategorię
    const category = await prisma.category.findFirst({
      select: { id: true, name: true }
    });

    if (!category) {
      console.error('❌ Brak kategorii w bazie danych!');
      process.exit(1);
    }

    console.log(`✅ Znaleziono kategorię: ${category.name}`);
    console.log('📦 Tworzenie testowego produktu...');

    // Usuń istniejący produkt testowy jeśli istnieje
    const existingProducts = await prisma.product.findMany({
      where: { sku: 'TEST-001' }
    });

    for (const prod of existingProducts) {
      await prisma.productImage.deleteMany({ where: { productId: prod.id } });
      await prisma.productVariant.deleteMany({ where: { productId: prod.id } });
    }
    
    await prisma.product.deleteMany({
      where: { sku: 'TEST-001' }
    });

    // Stwórz nowy produkt testowy z wariantem i zapasem
    const product = await prisma.product.create({
      data: {
        name: 'Testowy Produkt - Do Usunięcia',
        slug: 'testowy-produkt-do-usuniecia',
        sku: 'TEST-001',
        description: 'To jest testowy produkt o cenie 0.01 zł. Można go kupić w celach testowych.',
        price: 0.01,
        compareAtPrice: 1.00,
        status: ProductStatus.ACTIVE,
        categoryId: category.id,
        specifications: {
          'Typ': 'Produkt testowy',
          'Cena': '0.01 zł',
          'Stan': '1 sztuka',
          'Uwaga': 'Tylko do testów - proszę usunąć po zakończeniu'
        },
        tags: ['test', 'testowy', 'promocja'],
        images: {
          create: [
            {
              url: 'https://placehold.co/600x600/fef3c7/d97706?text=TEST+0.01+PLN',
              alt: 'Testowy produkt',
              order: 0
            }
          ]
        },
        variants: {
          create: [
            {
              name: 'Standard',
              sku: 'TEST-001-STD',
              price: 0.01,
              compareAtPrice: 1.00,
              attributes: { size: 'standard' }
            }
          ]
        }
      },
      include: {
        variants: true,
        images: true
      }
    });

    // Dodaj zapas dla wariantu
    if (product.variants.length > 0) {
      const variant = product.variants[0];
      
      // Pobierz pierwszą lokalizację magazynową
      const location = await prisma.location.findFirst();
      
      if (location) {
        await prisma.inventory.create({
          data: {
            variantId: variant.id,
            locationId: location.id,
            quantity: 1,
            reserved: 0,
            minimum: 0
          }
        });
        console.log(`✅ Dodano zapas w lokalizacji: ${location.name}`);
      }
    }

    console.log('✅ Produkt testowy utworzony pomyślnie!');
    console.log('');
    console.log('📋 Szczegóły produktu:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Nazwa: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Cena: ${product.price} zł`);
    console.log(`   Warianty: ${product.variants.length}`);
    console.log(`   Kategoria: ${category.name}`);
    console.log('');
    console.log('🔗 Link do produktu:');
    console.log(`   http://localhost:3000/products/${product.slug}`);
    console.log('');
    console.log('⚠️  PAMIĘTAJ: Usuń ten produkt po zakończeniu testów!');

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia produktu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTestProduct();
