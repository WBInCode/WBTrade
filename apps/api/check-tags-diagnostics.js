/**
 * Diagnostyka tagów w bazie danych
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DIAGNOSTYKA TAGÓW ===\n');
  
  // Pobierz próbkę produktów z tagami
  const products = await prisma.product.findMany({
    select: { tags: true },
    take: 5000
  });
  
  // Zlicz tagi
  const tagCounts = {};
  products.forEach(p => {
    p.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  
  // Sortuj i pokaż top 50
  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
  
  console.log('TOP 50 TAGÓW (z 5000 produktów):\n');
  sorted.forEach(([tag, count]) => {
    console.log(`${count.toString().padStart(5)} x "${tag}"`);
  });
  
  // Pokaż produkty bez tagów
  const noTags = products.filter(p => !p.tags || p.tags.length === 0).length;
  console.log(`\nProdukty bez tagów: ${noTags}`);
  
  await prisma.$disconnect();
}

main();
