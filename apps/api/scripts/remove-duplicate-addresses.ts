import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicates() {
  console.log('Finding duplicate addresses...');
  
  // Get all addresses ordered by creation date
  const addresses = await prisma.address.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  const seen = new Map<string, string>();
  const toDelete: string[] = [];
  
  for (const addr of addresses) {
    // Create unique key based on address fields
    const key = `${addr.userId}-${addr.firstName}-${addr.lastName}-${addr.street}-${addr.city}-${addr.postalCode}`;
    
    if (seen.has(key)) {
      // This is a duplicate - mark for deletion
      toDelete.push(addr.id);
      console.log(`  Duplicate found: ${addr.firstName} ${addr.lastName}, ${addr.street}`);
    } else {
      // First occurrence - keep it
      seen.set(key, addr.id);
    }
  }
  
  console.log(`\nFound ${toDelete.length} duplicate addresses to delete`);
  
  if (toDelete.length > 0) {
    await prisma.address.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log('Deleted duplicates successfully!');
  } else {
    console.log('No duplicates found.');
  }
  
  await prisma.$disconnect();
}

removeDuplicates()
  .catch((e) => {
    console.error('Error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
