require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.category.count();
    console.log('Categories count:', count);
    
    const cats = await prisma.category.findMany({ take: 3 });
    console.log('Sample categories:', cats.map(c => c.name));
  } catch (e) {
    console.error('DB error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
