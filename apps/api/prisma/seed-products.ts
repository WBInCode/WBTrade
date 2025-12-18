import { PrismaClient, ProductStatus } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

// Simple placeholder images (solid color placeholders)
const placeholderImages = [
  'https://placehold.co/600x600/e2e8f0/475569?text=Product',
  'https://placehold.co/600x600/fef3c7/d97706?text=Product',
  'https://placehold.co/600x600/dbeafe/1d4ed8?text=Product',
  'https://placehold.co/600x600/dcfce7/16a34a?text=Product',
  'https://placehold.co/600x600/fce7f3/db2777?text=Product',
];

// Product name parts for generating random names
const adjectives = [
  'Premium', 'Profesjonalny', 'Ultra', 'Mega', 'Super', 'Eco', 'Smart',
  'Compact', 'Deluxe', 'Classic', 'Modern', 'Elite', 'Pro', 'Max', 'Mini',
  'Advanced', 'Basic', 'Standard', 'Plus', 'Lite', 'Turbo', 'Power', 'Fast'
];

const brands = [
  'TechPro', 'HomeMax', 'StyleWear', 'GadgetX', 'ComfortPlus', 'EcoLife',
  'SmartHome', 'FashionOne', 'SportMax', 'KidZone', 'BeautyPro', 'AutoParts',
  'GreenGarden', 'FoodFresh', 'CleanPro', 'ToolMaster', 'LuxuryLine', 'ValueMax'
];

// Product types by category
const productTypes: Record<string, string[]> = {
  'smartfony': ['Smartfon', 'Telefon komórkowy', 'Smartphone 5G'],
  'laptopy': ['Laptop', 'Notebook', 'Ultrabook', 'Laptop gamingowy'],
  'akcesoria': ['Kabel USB', 'Ładowarka', 'Powerbank', 'Etui', 'Uchwyt', 'Podstawka', 'Hub USB'],
  'telewizory': ['Telewizor LED', 'TV OLED', 'Smart TV', 'Monitor'],
  'sluchawki': ['Słuchawki bezprzewodowe', 'Słuchawki nauszne', 'Słuchawki douszne', 'Headset'],
  'odziez-damska': ['Sukienka', 'Bluzka', 'Spodnie', 'Sweter', 'Kurtka', 'Płaszcz'],
  'odziez-meska': ['Koszula', 'T-shirt', 'Spodnie', 'Bluza', 'Kurtka', 'Marynarka'],
  'buty': ['Buty sportowe', 'Trampki', 'Półbuty', 'Sandały', 'Kozaki'],
  'meble': ['Krzesło', 'Stolik', 'Regał', 'Biurko', 'Sofa', 'Fotel', 'Szafka'],
  'dekoracje': ['Lampa', 'Wazon', 'Obraz', 'Świecznik', 'Poduszka', 'Koc'],
  'ogrod': ['Doniczka', 'Narzędzia ogrodowe', 'Meble ogrodowe', 'Grill'],
  'narzedzia': ['Wiertarka', 'Wkrętarka', 'Młotek', 'Zestaw narzędzi', 'Piła'],
  'zywnosc': ['Herbata', 'Kawa', 'Przekąski', 'Słodycze', 'Przyprawy'],
  'napoje': ['Woda mineralna', 'Sok', 'Napój energetyczny', 'Herbata mrożona'],
  'chemia-domowa': ['Proszek do prania', 'Płyn do naczyń', 'Odświeżacz', 'Środek czyszczący'],
  'zabawki': ['Klocki', 'Lalka', 'Samochodzik', 'Gra planszowa', 'Puzzle'],
  'ubranka': ['Body dziecięce', 'Śpioszki', 'Bluza dziecięca', 'Spodnie dziecięce'],
  'pielegnacja': ['Krem do twarzy', 'Balsam', 'Szampon', 'Odżywka', 'Serum'],
  'makijaz': ['Pomadka', 'Tusz do rzęs', 'Podkład', 'Puder', 'Cienie do powiek'],
  'perfumy': ['Woda perfumowana', 'Woda toaletowa', 'Perfumy', 'Mgiełka'],
  'czesci-samochodowe': ['Filtr oleju', 'Klocki hamulcowe', 'Świeca zapłonowa', 'Pasek klinowy'],
  'akcesoria-moto': ['Mata samochodowa', 'Uchwyt na telefon', 'Organizator', 'Pokrowiec'],
  'opony': ['Opona letnia', 'Opona zimowa', 'Opona całoroczna'],
  'male-agd': ['Czajnik elektryczny', 'Toster', 'Blender', 'Mikser', 'Robot kuchenny'],
  'default': ['Produkt', 'Artykuł', 'Towar']
};

const colors = ['Czarny', 'Biały', 'Szary', 'Niebieski', 'Czerwony', 'Zielony', 'Żółty', 'Różowy', 'Brązowy', 'Granatowy'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSku(index: number): string {
  const prefix = String.fromCharCode(65 + (index % 26));
  const suffix = String.fromCharCode(65 + Math.floor(index / 26) % 26);
  return `${prefix}${suffix}-${String(index).padStart(5, '0')}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateDescription(productType: string, brand: string, adj: string): string {
  return `${adj} ${productType.toLowerCase()} marki ${brand}. Wysokiej jakości produkt w atrakcyjnej cenie. Idealny wybór dla wymagających klientów.`;
}

async function main() {
  console.log('🌱 Starting bulk product seed...');

  // Get all categories
  const categories = await prisma.category.findMany({
    where: { parentId: { not: null } }, // Only subcategories
  });

  if (categories.length === 0) {
    console.error('❌ No categories found. Run main seed first!');
    process.exit(1);
  }

  console.log(`📁 Found ${categories.length} categories`);

  // Get a warehouse location for inventory
  const location = await prisma.location.findFirst({
    where: { type: 'SHELF' },
  });

  if (!location) {
    console.error('❌ No warehouse location found. Run main seed first!');
    process.exit(1);
  }

  const TOTAL_PRODUCTS = 10000;
  const BATCH_SIZE = 500;
  const batches = Math.ceil(TOTAL_PRODUCTS / BATCH_SIZE);

  console.log(`📦 Creating ${TOTAL_PRODUCTS} products in ${batches} batches...`);

  for (let batch = 0; batch < batches; batch++) {
    const startIdx = batch * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, TOTAL_PRODUCTS);
    const batchProducts: any[] = [];
    const batchImages: any[] = [];
    const batchVariants: any[] = [];

    for (let i = startIdx; i < endIdx; i++) {
      const category = randomElement(categories);
      const categorySlug = category.slug;
      const types = productTypes[categorySlug] || productTypes['default'];
      const productType = randomElement(types);
      const brand = randomElement(brands);
      const adj = randomElement(adjectives);
      const modelNumber = randomInt(100, 9999);
      
      const name = `${brand} ${adj} ${productType} ${modelNumber}`;
      const sku = generateSku(i);
      const baseSlug = slugify(name);
      const slug = `${baseSlug}-${sku.toLowerCase()}`;
      
      const price = randomInt(10, 5000) + 0.99;
      const hasDiscount = Math.random() > 0.7;
      const compareAtPrice = hasDiscount ? price * (1 + Math.random() * 0.3) : null;

      const productId = `prod_${i.toString().padStart(6, '0')}`;
      
      batchProducts.push({
        id: productId,
        name,
        slug,
        description: generateDescription(productType, brand, adj),
        specifications: JSON.stringify({
          'Marka': brand,
          'Model': `${modelNumber}`,
          'Kolor': randomElement(colors),
          'Materiał': 'Standard',
          'Gwarancja': '24 miesiące'
        }),
        sku,
        barcode: `590${String(i).padStart(10, '0')}`,
        status: 'ACTIVE' as ProductStatus,
        price,
        compareAtPrice,
        categoryId: category.id,
        metaTitle: `${name} - Kup w WBTrade`,
        metaDescription: `${name} w najlepszej cenie. Szybka dostawa!`,
      });

      // Add 1-2 images per product
      const imageCount = randomInt(1, 2);
      for (let img = 0; img < imageCount; img++) {
        batchImages.push({
          productId,
          url: randomElement(placeholderImages),
          alt: `${name} - zdjęcie ${img + 1}`,
          order: img,
        });
      }

      // Add 1-3 variants per product
      const variantCount = randomInt(1, 3);
      for (let v = 0; v < variantCount; v++) {
        const variantSku = `${sku}-V${v + 1}`;
        const variantColor = randomElement(colors);
        const variantSize = randomElement(sizes);
        const variantPrice = price + randomInt(-50, 100);
        
        batchVariants.push({
          productId,
          name: `${variantColor} / ${variantSize}`,
          sku: variantSku,
          barcode: `590${String(i).padStart(7, '0')}${String(v).padStart(3, '0')}`,
          price: Math.max(variantPrice, 9.99),
          compareAtPrice: compareAtPrice ? compareAtPrice + randomInt(-20, 50) : null,
          attributes: JSON.stringify({ color: variantColor, size: variantSize }),
        });
      }
    }

    // Bulk insert products
    await prisma.product.createMany({
      data: batchProducts,
      skipDuplicates: true,
    });

    // Bulk insert images
    await prisma.productImage.createMany({
      data: batchImages,
      skipDuplicates: true,
    });

    // Bulk insert variants
    await prisma.productVariant.createMany({
      data: batchVariants,
      skipDuplicates: true,
    });

    const progress = ((batch + 1) / batches * 100).toFixed(1);
    console.log(`  ✓ Batch ${batch + 1}/${batches} (${progress}%) - Products ${startIdx + 1}-${endIdx}`);
  }

  // Add inventory for all variants
  console.log('📊 Adding inventory for variants...');
  
  const variants = await prisma.productVariant.findMany({
    select: { id: true },
  });

  const inventoryBatchSize = 1000;
  for (let i = 0; i < variants.length; i += inventoryBatchSize) {
    const inventoryBatch = variants.slice(i, i + inventoryBatchSize).map(v => ({
      variantId: v.id,
      locationId: location.id,
      quantity: randomInt(0, 500),
      reserved: 0,
      minimum: randomInt(5, 20),
    }));

    await prisma.inventory.createMany({
      data: inventoryBatch,
      skipDuplicates: true,
    });

    if ((i + inventoryBatchSize) % 5000 === 0 || i + inventoryBatchSize >= variants.length) {
      console.log(`  ✓ Inventory ${Math.min(i + inventoryBatchSize, variants.length)}/${variants.length}`);
    }
  }

  const finalCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const imageCount = await prisma.productImage.count();

  console.log('');
  console.log('✅ Bulk product seed completed!');
  console.log(`   📦 Total products: ${finalCount}`);
  console.log(`   🏷️  Total variants: ${variantCount}`);
  console.log(`   🖼️  Total images: ${imageCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
