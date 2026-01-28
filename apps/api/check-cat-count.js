require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const withBL = await p.category.count({ where: { baselinkerCategoryId: { not: null } } });
  const all = await p.category.count();
  const mainCats = await p.category.count({ where: { baselinkerCategoryId: { not: null }, parentId: null } });
  const subCats = await p.category.count({ where: { baselinkerCategoryId: { not: null }, parentId: { not: null } } });
  
  console.log('Kategorie z baselinkerCategoryId:', withBL);
  console.log('Wszystkie kategorie:', all);
  console.log('Główne kategorie:', mainCats);
  console.log('Podkategorie:', subCats);
}

main().finally(() => p.$disconnect());
