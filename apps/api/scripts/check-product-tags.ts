import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find products by name containing keywords
  const momax = await prisma.product.findFirst({
    where: { name: { contains: 'Momax Elite' } },
    select: { id: true, name: true, tags: true }
  });
  
  const incase = await prisma.product.findFirst({
    where: { name: { contains: 'Incase Protective Guard' } },
    select: { id: true, name: true, tags: true }
  });
  
  console.log('=== Momax Product ===');
  console.log('Name:', momax?.name);
  console.log('Tags:', momax?.tags);
  
  console.log('\n=== Incase Product ===');
  console.log('Name:', incase?.name);
  console.log('Tags:', incase?.tags);
  
  // Test wholesaler regex
  const WHOLESALER_REGEX = /^(hurtownia[:\-_](.+)|Ikonka|BTP|HP|Gastro|Horeca|Hurtownia\s+Przemysłowa|hp)$/i;
  
  if (momax?.tags) {
    console.log('\n=== Momax Wholesaler Detection ===');
    for (const tag of momax.tags) {
      const match = tag.match(WHOLESALER_REGEX);
      console.log(`Tag "${tag}": match = ${match ? 'YES -> ' + (match[2] || match[1] || tag) : 'NO'}`);
    }
  }
  
  if (incase?.tags) {
    console.log('\n=== Incase Wholesaler Detection ===');
    for (const tag of incase.tags) {
      const match = tag.match(WHOLESALER_REGEX);
      console.log(`Tag "${tag}": match = ${match ? 'YES -> ' + (match[2] || match[1] || tag) : 'NO'}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
