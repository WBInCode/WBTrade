import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({ 
    select: { id: true, name: true, tags: true }
  });
  
  let withWarehouse = 0;
  let withoutWarehouse = 0;
  
  products.forEach(p => { 
    const tags = (p.tags as string[]) || []; 
    const lower = tags.map(t => t.toLowerCase()); 
    const hasHP = lower.some(t => t.includes('hurtownia przemysłowa') || t === 'hp'); 
    const hasIkonka = lower.includes('ikonka') || lower.includes('forcetop'); 
    const hasLeker = lower.includes('leker'); 
    const hasBTP = lower.includes('btp'); 
    const hasAny = hasHP || hasIkonka || hasLeker || hasBTP; 
    
    if (!hasAny) {
      withoutWarehouse++;
      console.log('NO WAREHOUSE:', p.name.substring(0,60));
      console.log('  Tags:', tags.slice(0,5).join(', '));
    } else {
      withWarehouse++;
    }
  });
  
  console.log('\n---');
  console.log('With warehouse tag:', withWarehouse);
  console.log('Without warehouse tag:', withoutWarehouse);
  
  await prisma.$disconnect();
}

check();
