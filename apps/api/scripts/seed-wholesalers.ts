/**
 * Seed script for Wholesaler model
 * 
 * Populates the wholesalers table with the 7 existing warehouses,
 * preserving all current hardcoded values.
 * 
 * Usage: npx tsx apps/api/scripts/seed-wholesalers.ts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WHOLESALERS = [
  {
    key: 'leker',
    name: 'Leker',
    baselinkerInventoryId: '22952',
    prefix: 'leker-',
    skuPrefix: 'LEKER-',
    location: 'Chynów',
    warehouseDisplayName: 'Magazyn Chynów',
    aliases: [],
    color: '#ef4444',
    isActive: true,
    skipInSync: false,
    hasPriceRules: true,
    sortOrder: 1,
  },
  {
    key: 'btp',
    name: 'BTP',
    baselinkerInventoryId: '22953',
    prefix: 'btp-',
    skuPrefix: 'BTP-',
    location: 'Chotów',
    warehouseDisplayName: 'Magazyn Chotów',
    aliases: ['forcetop'],
    color: '#22c55e',
    isActive: true,
    skipInSync: false,
    hasPriceRules: true,
    sortOrder: 2,
  },
  {
    key: 'hp',
    name: 'HP',
    baselinkerInventoryId: '22954',
    prefix: 'hp-',
    skuPrefix: null,
    location: 'Zielona Góra',
    warehouseDisplayName: 'Magazyn Zielona Góra',
    aliases: ['hurtownia przemysłowa'],
    color: '#3b82f6',
    isActive: true,
    skipInSync: false,
    hasPriceRules: true,
    sortOrder: 3,
  },
  {
    key: 'dofirmy',
    name: 'DoFirmy',
    baselinkerInventoryId: '26423',
    prefix: 'dofirmy-',
    skuPrefix: 'DOFIRMY-',
    location: 'Koszalin',
    warehouseDisplayName: 'Magazyn Koszalin',
    aliases: [],
    color: '#06b6d4',
    isActive: true,
    skipInSync: false,
    hasPriceRules: true,
    sortOrder: 4,
  },
  {
    key: 'outlet',
    name: 'Outlet',
    baselinkerInventoryId: '23662',
    prefix: 'outlet-',
    skuPrefix: null,
    location: 'Rzeszów',
    warehouseDisplayName: 'Magazyn Rzeszów',
    aliases: ['magazyn zwrotów', 'rzeszów'],
    color: '#ec4899',
    isActive: true,
    skipInSync: false,
    hasPriceRules: false,
    sortOrder: 5,
  },
  {
    key: 'hurtownia-kuchenna',
    name: 'Hurtownia Kuchenna',
    baselinkerInventoryId: '26591',
    prefix: 'hk-',
    skuPrefix: 'HK-',
    location: 'Hurtownia Kuchenna',
    warehouseDisplayName: 'Hurtownia Kuchenna',
    aliases: ['kuchenna'],
    color: '#64748b',
    isActive: true,
    skipInSync: false,
    hasPriceRules: true,
    sortOrder: 6,
  },
  {
    key: 'astralomza',
    name: 'astralomza',
    baselinkerInventoryId: '26477',
    prefix: 'astralomza-',
    skuPrefix: null,
    location: 'Piotrków',
    warehouseDisplayName: null,
    aliases: [],
    color: '#f59e0b',
    isActive: false,
    skipInSync: false,
    hasPriceRules: false,
    sortOrder: 7,
  },
  {
    key: 'ikonka',
    name: 'Ikonka',
    baselinkerInventoryId: '22951',
    prefix: '',
    skuPrefix: null,
    location: 'Białystok',
    warehouseDisplayName: 'Magazyn Białystok',
    aliases: ['główny'],
    color: '#a855f7',
    isActive: true,
    skipInSync: true,
    hasPriceRules: false,
    sortOrder: 8,
  },
  {
    key: 'default',
    name: 'Główny',
    baselinkerInventoryId: '11235',
    prefix: '',
    skuPrefix: null,
    location: null,
    warehouseDisplayName: 'Magazyn Główny',
    aliases: [],
    color: '#6b7280',
    isActive: true,
    skipInSync: true,
    hasPriceRules: false,
    sortOrder: 99,
  },
];

async function main() {
  console.log('Seeding wholesalers...');

  for (const w of WHOLESALERS) {
    await prisma.wholesaler.upsert({
      where: { key: w.key },
      update: w,
      create: w,
    });
    console.log(`  ✓ ${w.name} (${w.key})`);
  }

  console.log(`Done! Seeded ${WHOLESALERS.length} wholesalers.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
