/**
 * Cleanup Script - Usuwa prefiksy z slugów, SKU i nazw
 * 
 * Czyści:
 * - [BTP], [HP], [IKONKA] z nazw kategorii
 * - Prefiksy z slugów kategorii
 * - Unikalne ID z końca slugów (np. -2622631)
 * - Prefiksy z SKU produktów
 * 
 * Uruchom: npx ts-node scripts/cleanup-slugs-and-sku.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

function cleanName(name: string): string {
  // Usuń prefiksy [BTP], [HP], [IKONKA] itp.
  return name
    .replace(/^\[BTP\]\s*/i, '')
    .replace(/^\[HP\]\s*/i, '')
    .replace(/^\[IKONKA\]\s*/i, '')
    .replace(/^\[.*?\]\s*/, '') // Usuń dowolny [PREFIKS]
    .trim();
}

function cleanSlug(slug: string): string {
  // Usuń prefiks btp-, hp-, ikonka-, leker-
  let cleaned = slug
    .replace(/^leker-/i, '')
    .replace(/^btp-/i, '')
    .replace(/^hp-/i, '')
    .replace(/^ikonka-/i, '');
  
  // Usuń unikalne ID z końca (np. -2622631, -123456, -212545377)
  cleaned = cleaned.replace(/-\d{6,}$/, '');
  
  return cleaned;
}

function cleanSku(sku: string): string {
  // Usuń prefiksy LEKER-, BTP-, HP-, IKONKA-
  return sku
    .replace(/^LEKER-/i, '')
    .replace(/^BTP-/i, '')
    .replace(/^HP-/i, '')
    .replace(/^IKONKA-/i, '');
}

async function cleanupCategories() {
  console.log('📂 Czyszczenie kategorii...');
  
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
  
  console.log(`   Znaleziono ${categories.length} kategorii`);
  
  let updated = 0;
  const slugCounts = new Map<string, number>();
  
  for (const category of categories) {
    const cleanedName = cleanName(category.name);
    const baseSlug = cleanSlug(category.slug);
    
    // Sprawdź czy slug już istnieje
    const count = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, count + 1);
    
    const finalSlug = count > 0 ? `${baseSlug}-${count}` : baseSlug;
    
    // Aktualizuj tylko jeśli coś się zmieniło
    if (cleanedName !== category.name || finalSlug !== category.slug) {
      await prisma.category.update({
        where: { id: category.id },
        data: {
          name: cleanedName,
          slug: finalSlug,
        }
      });
      
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`   Zaktualizowano ${updated} kategorii...`);
      }
    }
  }
  
  console.log(`✅ Zaktualizowano ${updated} kategorii`);
}

async function cleanupProducts() {
  console.log('📦 Czyszczenie produktów...');
  
  // Policz produkty
  const totalProducts = await prisma.product.count();
  console.log(`   Znaleziono ${totalProducts} produktów`);
  
  let updated = 0;
  const batchSize = 500;
  
  for (let skip = 0; skip < totalProducts; skip += batchSize) {
    const products = await prisma.product.findMany({
      skip,
      take: batchSize,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
      }
    });
    
    for (const product of products) {
      const cleanedName = cleanName(product.name);
      const cleanedSku = product.sku ? cleanSku(product.sku) : product.sku;
      const baseSlug = cleanSlug(product.slug);
      
      // Regeneruj slug z czystej nazwy
      const newSlug = slugify(cleanedName);
      
      // Aktualizuj tylko jeśli coś się zmieniło
      if (cleanedName !== product.name || cleanedSku !== product.sku || newSlug !== product.slug) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              name: cleanedName,
              sku: cleanedSku,
              slug: newSlug,
            }
          });
          
          updated++;
        } catch (error) {
          // Jeśli slug nie jest unikalny, dodaj ID
          const uniqueSlug = `${newSlug}-${product.id.slice(0, 8)}`;
          await prisma.product.update({
            where: { id: product.id },
            data: {
              name: cleanedName,
              sku: cleanedSku,
              slug: uniqueSlug,
            }
          });
          updated++;
        }
      }
    }
    
    console.log(`   Zaktualizowano ${updated}/${totalProducts} produktów...`);
  }
  
  console.log(`✅ Zaktualizowano ${updated} produktów`);
}

async function cleanupVariants() {
  console.log('🔧 Czyszczenie wariantów...');
  
  const totalVariants = await prisma.productVariant.count();
  console.log(`   Znaleziono ${totalVariants} wariantów`);
  
  let updated = 0;
  const batchSize = 1000;
  
  for (let skip = 0; skip < totalVariants; skip += batchSize) {
    const variants = await prisma.productVariant.findMany({
      skip,
      take: batchSize,
      select: {
        id: true,
        sku: true,
      }
    });
    
    for (const variant of variants) {
      if (variant.sku) {
        const cleanedSku = cleanSku(variant.sku);
        
        if (cleanedSku !== variant.sku) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { sku: cleanedSku }
          });
          
          updated++;
        }
      }
    }
    
    if (updated > 0) {
      console.log(`   Zaktualizowano ${updated}/${totalVariants} wariantów...`);
    }
  }
  
  console.log(`✅ Zaktualizowano ${updated} wariantów`);
}

async function main() {
  console.log('🧹 Start czyszczenia bazy danych...\n');
  
  try {
    // 1. Czyść kategorie
    await cleanupCategories();
    console.log('');
    
    // 2. Czyść produkty
    await cleanupProducts();
    console.log('');
    
    // 3. Czyść warianty
    await cleanupVariants();
    console.log('');
    
    console.log('✅ Czyszczenie zakończone pomyślnie!');
    console.log('\n📊 Sprawdź wyniki:');
    console.log('   - Kategorie powinny mieć czyste nazwy i slugi');
    console.log('   - Produkty bez prefiksów w nazwach i SKU');
    console.log('   - Slugi powinny być krótsze i czytelniejsze');
    
  } catch (error) {
    console.error('❌ Błąd podczas czyszczenia:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
