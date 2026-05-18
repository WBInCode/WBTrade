import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();

const HIDDEN_TAGS = ['błąd zdjęcia', 'błąd zdjęcia ', 'zabronione-nie-wrzucać'];

async function main() {
  console.log('Pobieranie produktów z bazy...');

  const products = await prisma.product.findMany({
    where: {
      price: { gt: 0 },
      variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } },
      NOT: { tags: { hasSome: HIDDEN_TAGS } },
    },
    include: {
      category: true,
      variants: {
        include: {
          inventory: true,
        },
      },
    },
    orderBy: [
      { category: { name: 'asc' } },
      { popularityScore: 'desc' },
    ],
  });

  console.log(`Znaleziono ${products.length} produktów. Generowanie CSV...`);

  const BOM = '\uFEFF';
  const SEP = ';';
  const header = [
    'Kategoria',
    'Nazwa',
    'SKU',
    'Slug',
    'Cena',
    'Cena przed promocją',
    'Popularność',
    'Sprzedaż',
    'Wyświetlenia',
    'Stan magazynowy',
    'Tagi',
  ].join(SEP);

  const rows = products.map((p) => {
    const categoryName = p.category?.name || 'Brak kategorii';
    const totalStock = p.variants.reduce(
      (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantity - inv.reserved, 0),
      0
    );
    const tags = p.tags.join(', ');
    const escapeCsv = (val: string) => val.replace(/;/g, ',').replace(/\n/g, ' ');

    return [
      escapeCsv(categoryName),
      escapeCsv(p.name),
      p.sku || '',
      p.slug,
      Number(p.price).toFixed(2),
      p.compareAtPrice ? Number(p.compareAtPrice).toFixed(2) : '',
      p.popularityScore.toFixed(2),
      p.salesCount.toString(),
      p.viewCount.toString(),
      totalStock.toString(),
      escapeCsv(tags),
    ].join(SEP);
  });

  const csv = BOM + [header, ...rows].join('\n');
  const outputPath = path.join(__dirname, '..', '..', 'export-products.csv');
  fs.writeFileSync(outputPath, csv, 'utf-8');

  console.log(`CSV zapisany: ${outputPath}`);
  console.log(`Liczba produktów: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
