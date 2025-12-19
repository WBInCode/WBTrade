/**
 * Jest Test Setup
 * Runs before all tests
 */

import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('../db', () => ({
  prisma: new PrismaClient(),
}));

// Mock Redis
jest.mock('../lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    exists: jest.fn(),
    multi: jest.fn(() => ({
      incr: jest.fn().mockReturnThis(),
      ttl: jest.fn().mockReturnThis(),
      exists: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1], [null, 300]]),
    })),
    eval: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn(),
  })),
  closeRedisConnection: jest.fn(),
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  recordFailedLogin: jest.fn().mockResolvedValue(1),
  getFailedLoginAttempts: jest.fn().mockResolvedValue(0),
  resetFailedLoginAttempts: jest.fn(),
  lockAccount: jest.fn(),
  isAccountLocked: jest.fn().mockResolvedValue({ locked: false, ttl: 0 }),
  storeEmailVerificationToken: jest.fn(),
  verifyEmailToken: jest.fn(),
  storePasswordResetToken: jest.fn(),
  verifyPasswordResetToken: jest.fn(),
  incrementRateLimit: jest.fn().mockResolvedValue({ count: 1, ttl: 60 }),
}));

// Mock Meilisearch
jest.mock('../lib/meilisearch', () => ({
  getProductsIndex: jest.fn(() => ({
    search: jest.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0 }),
    addDocuments: jest.fn().mockResolvedValue({ taskUid: 1 }),
    deleteDocument: jest.fn(),
    getStats: jest.fn().mockResolvedValue({ numberOfDocuments: 0, isIndexing: false }),
  })),
  meiliClient: {
    health: jest.fn().mockResolvedValue({ status: 'available' }),
  },
  initializeMeilisearch: jest.fn(),
  PRODUCTS_INDEX: 'products',
}));

// Mock queue
jest.mock('../lib/queue', () => ({
  queueProductIndex: jest.fn(),
  queueProductDelete: jest.fn(),
  queueFullReindex: jest.fn(),
  queueEmail: jest.fn(),
  QUEUE_NAMES: {
    SEARCH_INDEX: 'search-index',
    EMAIL: 'email',
    IMPORT: 'import',
    EXPORT: 'export',
    INVENTORY_SYNC: 'inventory-sync',
    SHIPPING: 'shipping',
    RESERVATION_CLEANUP: 'reservation-cleanup',
  },
}));

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-12345';
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Add cleanup if needed
});
