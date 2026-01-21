require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Przykłady SKU które mają baselinkerProductId zaczynające się od hp
  const hpProducts = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp' } },
    select: { sku: true, baselinkerProductId: true },
    take: 10
  });
  
  console.log('Przykłady produktów HP z bazy (po blId):');
  hpProducts.forEach(p => console.log('  SKU:', p.sku, '| blId:', p.baselinkerProductId));
  
  // Ile produktów z SKU zaczynającym się od HP-
  const hpSkuCount = await prisma.product.count({
    where: { sku: { startsWith: 'HP-' } }
  });
  console.log('\nProdukty z SKU HP-*:', hpSkuCount);
  
  // Ile produktów z SKU zaczynającym się od HP (bez myślnika)
  const hpSkuNoHyphen = await prisma.product.count({
    where: { sku: { startsWith: 'HP' } }
  });
  console.log('Produkty z SKU HP*:', hpSkuNoHyphen);
  
  // Pokaż różne prefiksy SKU
  const skuPrefixes = await prisma.product.findMany({
    where: { baselinkerProductId: { startsWith: 'hp' } },
    select: { sku: true },
    take: 100
  });
  
  const prefixes = new Set();
  skuPrefixes.forEach(p => {
    const match = p.sku?.match(/^([A-Z]+-?)/);
    if (match) prefixes.add(match[1]);
  });
  console.log('\nPrefiksy SKU dla hp-*:', [...prefixes]);
  
  await prisma.$disconnect();
}

check();
