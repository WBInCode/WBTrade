import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma Client instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['warn', 'error'] 
    : ['error'],
  transactionOptions: {
    maxWait: 10000,  // 10s to acquire connection from pool
    timeout: 15000,  // 15s global transaction timeout (overridden per-transaction where needed)
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;