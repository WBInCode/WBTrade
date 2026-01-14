import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma Client instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Neon serverless PostgreSQL configuration
// - connection_limit: Limit connections per instance
// - pool_timeout: How long to wait for a connection
// - connect_timeout: How long to wait for initial connection
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

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle connection errors gracefully
prisma.$connect().catch((err) => {
  console.error('Failed to connect to database:', err);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle SIGTERM for graceful shutdown on Render
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting Prisma...');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle SIGINT for local development
process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting Prisma...');
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;