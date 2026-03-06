require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function count() {
  const all = await prisma.product.findMany({ select: { tags: true } });
  
  // Paczkomaty i Kurier + produkt w paczce
  const paczkomatZPaczka = all.filter(p => 
    p.tags.some(t => t.toLowerCase() === 'paczkomaty i kurier') &&
    p.tags.some(t => t.toLowerCase().includes('produkt w paczce'))
  );
  
  // Tylko kurier + waga
  const kurierZWaga = all.filter(p => 
    p.tags.some(t => t.toLowerCase() === 'tylko kurier') &&
    p.tags.some(t => t.toLowerCase().includes('kg'))
  );
  
  console.log('=== PRAWIDŁOWE TAGI ===');
  console.log('Paczkomaty i Kurier + produkt w paczce:', paczkomatZPaczka.length);
  console.log('Tylko kurier + waga kg:', kurierZWaga.length);
  console.log('---');
  console.log('ŁĄCZNIE:', paczkomatZPaczka.length + kurierZWaga.length);
  
  await prisma.$disconnect();
}
count();
