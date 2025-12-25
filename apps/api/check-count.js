const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_ioaBnk75ybAm@ep-soft-water-ag7x4ae8-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  // Clean up stuck RUNNING syncs
  const cleaned = await p.baselinkerSyncLog.updateMany({
    where: { status: 'RUNNING' },
    data: { 
      status: 'FAILED',
      errors: ['Sync interrupted - marked as failed'],
      completedAt: new Date()
    }
  });
  
  console.log('Cleaned up', cleaned.count, 'stuck RUNNING syncs');
  
  // Show final stats
  const products = await p.product.count();
  const variants = await p.productVariant.count();
  const images = await p.productImage.count();
  
  console.log('\n=== Final Stats ===');
  console.log('Products:', products);
  console.log('Variants:', variants);
  console.log('Images:', images);
}

main().finally(() => p.$disconnect());
