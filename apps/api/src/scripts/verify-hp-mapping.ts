/**
 * Weryfikacja: czy wszystkie slugi w hp-category-mapping.json istnieją w bazie danych
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Load mapping
  const mappingPath = path.join(__dirname, '../../config/hp-category-mapping.json');
  const data = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

  // Get all unique slugs from mapping
  const slugsInMapping = new Set<string>();
  for (const [key, val] of Object.entries(data.mapping)) {
    if (key === '_comment') continue;
    const target = val as { subSlug: string; comment: string };
    slugsInMapping.add(target.subSlug);
  }

  console.log(`📋 Unikalne slugi w mapowaniu: ${slugsInMapping.size}`);

  // Load all DB categories
  const dbCategories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true },
  });
  const dbSlugs = new Set(dbCategories.map(c => c.slug));

  console.log(`🗄️  Kategorie w bazie: ${dbCategories.length}`);
  console.log('');

  // Check each mapping slug
  let ok = 0;
  let missing = 0;
  for (const slug of [...slugsInMapping].sort()) {
    if (dbSlugs.has(slug)) {
      const cat = dbCategories.find(c => c.slug === slug)!;
      const parent = cat.parentId ? dbCategories.find(c => c.id === cat.parentId) : null;
      const fullName = parent ? `${parent.name} > ${cat.name}` : cat.name;
      console.log(`  ✅ ${slug} → ${fullName}`);
      ok++;
    } else {
      console.log(`  ❌ ${slug} → NIE ISTNIEJE W BAZIE!`);
      missing++;
    }
  }

  console.log('');
  console.log(`Wynik: ${ok} OK, ${missing} BRAKUJE`);
  if (missing === 0) {
    console.log('🎉 Wszystkie slugi z mapowania istnieją w bazie!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
