/**
 * Migration script: Moves carousel data from old Settings JSON blob
 * to the new Carousel table. Run once, then old data stays as backup.
 *
 * Usage: npx ts-node prisma/seed-carousels.ts
 */
import { PrismaClient, CarouselMode } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CAROUSELS = [
  {
    name: 'Polecane dla Ciebie',
    slug: 'featured',
    description: 'Ręcznie wybrane produkty wyświetlane na górze strony głównej',
    icon: 'star',
    color: 'from-violet-600 to-purple-700',
    mode: CarouselMode.MANUAL,
    productLimit: 20,
    autoSource: null,
    sortOrder: 0,
  },
  {
    name: 'Bestsellery',
    slug: 'bestsellers',
    description: 'Najczęściej kupowane produkty',
    icon: 'flame',
    color: 'from-orange-500 to-red-600',
    mode: CarouselMode.AUTOMATIC,
    productLimit: 20,
    autoSource: 'bestsellers',
    sortOrder: 1,
  },
  {
    name: 'Najlepiej oceniane',
    slug: 'top-rated',
    description: 'Produkty z najwyższymi ocenami',
    icon: 'star',
    color: 'from-amber-500 to-yellow-600',
    mode: CarouselMode.AUTOMATIC,
    productLimit: 20,
    autoSource: 'top-rated',
    sortOrder: 2,
  },
  {
    name: 'Nowości',
    slug: 'newProducts',
    description: 'Produkty dodane w ostatnich 2 tygodniach',
    icon: 'sparkles',
    color: 'from-emerald-500 to-teal-600',
    mode: CarouselMode.AUTOMATIC,
    productLimit: 20,
    autoSource: 'newest',
    sortOrder: 3,
  },
  {
    name: 'Zabawki',
    slug: 'toys',
    description: 'Bestsellery z kategorii Zabawki',
    icon: 'gift',
    color: 'from-pink-500 to-rose-600',
    mode: CarouselMode.AUTOMATIC,
    productLimit: 20,
    autoSource: 'bestsellers',
    sortOrder: 4,
  },
  {
    name: 'Sezonowe',
    slug: 'seasonal',
    description: 'Produkty sezonowe — automatycznie dopasowane do pory roku',
    icon: 'snowflake',
    color: 'from-blue-500 to-cyan-600',
    mode: CarouselMode.AUTOMATIC,
    productLimit: 20,
    autoSource: 'seasonal',
    sortOrder: 5,
  },
];

async function main() {
  console.log('=== Carousel Migration: Settings JSON → Carousel table ===\n');

  // 1. Check if carousels already exist
  const existingCount = await prisma.carousel.count();
  if (existingCount > 0) {
    console.log(`⚠ Found ${existingCount} carousels already in DB. Skipping migration.`);
    return;
  }

  // 2. Read old settings
  let oldCarousels: Record<string, { productIds?: string[]; isAutomatic?: boolean; categorySlug?: string }> = {};
  try {
    const setting = await prisma.settings.findUnique({ where: { key: 'homepage_carousels' } });
    if (setting?.value) {
      oldCarousels = JSON.parse(setting.value);
      console.log(`✓ Loaded old settings: ${Object.keys(oldCarousels).join(', ')}`);
    }
  } catch (e) {
    console.log('⚠ No old settings found or parse error, creating fresh carousels');
  }

  // 3. Look up category IDs by slugs for enrichment
  const categoryMap = new Map<string, string>();
  const allCats = await prisma.category.findMany({ select: { id: true, slug: true } });
  allCats.forEach(c => categoryMap.set(c.slug, c.id));

  // 4. Create carousels
  for (const def of DEFAULT_CAROUSELS) {
    const old = oldCarousels[def.slug];
    const productIds = old?.productIds ? [...new Set(old.productIds)] : [];
    
    // Determine mode based on old data
    let mode = def.mode;
    if (productIds.length > 0 && old?.isAutomatic === false) {
      mode = CarouselMode.MANUAL;
    } else if (productIds.length > 0 && (old?.isAutomatic === true || old?.isAutomatic === undefined)) {
      mode = CarouselMode.SEMI_AUTOMATIC;
    }

    // Map old categorySlug to categoryIds array
    const categoryIds: string[] = [];
    if (old?.categorySlug) {
      const catId = categoryMap.get(old.categorySlug);
      if (catId) categoryIds.push(catId);
    }
    // For toys, ensure zabawki category is included
    if (def.slug === 'toys' && categoryIds.length === 0) {
      const zabawkiId = categoryMap.get('zabawki');
      if (zabawkiId) categoryIds.push(zabawkiId);
    }

    const carousel = await prisma.carousel.create({
      data: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        icon: def.icon,
        color: def.color,
        mode,
        productLimit: def.productLimit,
        categoryIds,
        productIds,
        autoSource: def.autoSource,
        isVisible: true,
        isActive: true,
        sortOrder: def.sortOrder,
      },
    });

    console.log(`✓ Created: ${carousel.name} (${carousel.slug}) — mode=${mode}, ${productIds.length} manual products, ${categoryIds.length} categories`);
  }

  console.log(`\n✓ Migration complete. ${DEFAULT_CAROUSELS.length} carousels created.`);
}

main()
  .catch(e => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
