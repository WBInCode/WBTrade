import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'https://api.baselinker.com/connector.php';
const TOKEN = process.env.BASELINKER_API_TOKEN!;

async function blRequest(method: string, params: any = {}) {
  const fd = new URLSearchParams();
  fd.append('method', method);
  fd.append('parameters', JSON.stringify(params));
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'X-BLToken': TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fd.toString(),
  });
  return r.json();
}

async function main() {
  // 1. Get BL categories
  const resp = await blRequest('getInventoryCategories', { inventory_id: 22954 });
  const cats = resp.categories || {};

  const byId = new Map<number, any>();
  for (const [id, c] of Object.entries(cats) as [string, any][]) {
    byId.set(parseInt(id), c);
  }

  function getPath(id: number): string {
    const c = byId.get(id);
    if (!c) return '?';
    if (c.parent_id && byId.has(c.parent_id)) {
      return getPath(c.parent_id) + ' > ' + c.name;
    }
    return c.name;
  }

  const blPaths = new Map<number, string>();
  for (const [id] of byId) {
    blPaths.set(id, getPath(id));
  }

  // 2. Get DB categories with baselinkerCategoryId
  const dbCats = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: {
      slug: true,
      name: true,
      baselinkerCategoryId: true,
      parent: { select: { name: true, parent: { select: { name: true } } } },
    },
  });

  // 3. Load mapping
  const fs = await import('fs');
  const path = await import('path');
  const mappingPath = path.join(__dirname, '../../config/hp-category-mapping.json');
  const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

  // Get all slugs used in mapping
  const usedSlugs = new Set<string>();
  for (const [key, val] of Object.entries(mappingData.mapping)) {
    if (key === '_comment') continue;
    usedSlugs.add((val as any).subSlug);
  }

  console.log('═'.repeat(110));
  console.log('WERYFIKACJA: slug → nazwa DB → BL category ID → nazwa BL');
  console.log('═'.repeat(110));
  console.log('');

  let ok = 0;
  let mismatch = 0;
  const issues: string[] = [];

  for (const slug of [...usedSlugs].sort()) {
    const dbCat = dbCats.find(c => c.slug === slug);
    if (!dbCat) {
      issues.push(`❌ Slug "${slug}" nie istnieje w DB`);
      continue;
    }

    const blCatId = parseInt(dbCat.baselinkerCategoryId!, 10);
    const blPath = blPaths.get(blCatId);

    // Build DB path
    let dbPath = dbCat.name;
    if (dbCat.parent) {
      dbPath = dbCat.parent.name + ' > ' + dbCat.name;
      if (dbCat.parent.parent) {
        dbPath = dbCat.parent.parent.name + ' > ' + dbPath;
      }
    }

    const match = blPath ? '✅' : '❌';
    if (blPath) ok++;
    else mismatch++;

    console.log(`${match} slug: ${slug}`);
    console.log(`   DB:  ${dbPath}`);
    console.log(`   BL:  ${blPath || 'NIE ZNALEZIONO (ID: ' + blCatId + ')'}`);
    if (blPath && !blPath.includes(dbCat.name)) {
      console.log(`   ⚠️  NAZWA RÓŻNI SIĘ!`);
      mismatch++;
    }
    console.log('');
  }

  console.log('═'.repeat(110));
  console.log(`Łącznie: ${usedSlugs.size} slugów w mapping | ✅ ${ok} OK | ❌ ${mismatch} problemów`);
  if (issues.length) {
    console.log('\nProblemy:');
    issues.forEach(i => console.log('  ' + i));
  }

  await prisma.$disconnect();
}

main();
