import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma Client instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma Client with connection pool settings for Neon (serverless PostgreSQL)
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['warn', 'error'] 
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Add middleware to handle connection retries for Neon
prisma.$use(async (params, next) => {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await next(params);
    } catch (error: any) {
      lastError = error;
      // Check if it's a connection closed error
      if (error.message?.includes('Closed') || 
          error.code === 'P1017' || 
          error.code === 'P2024' ||
          error.message?.includes('connection')) {
        console.warn(`[Prisma] Connection error on attempt ${attempt}/${maxRetries}, retrying...`);
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }
      // Not a connection error, throw immediately
      throw error;
    }
  }
  
  // All retries exhausted
  throw lastError;
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle SIGINT and SIGTERM for graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;