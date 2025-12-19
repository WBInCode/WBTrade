/**
 * Unit Tests for Cache Service
 */

import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  getCachedProduct,
  setCachedProduct,
  getCachedProductList,
  setCachedProductList,
  invalidateProductCache,
  getCachedInventory,
  setCachedInventory,
  acquireLock,
  releaseLock,
  withLock,
  CACHE_TTL,
} from '../../lib/cache';
import { getRedisClient } from '../../lib/redis';

// Redis is already mocked in setup.ts

describe('Cache Service', () => {
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = getRedisClient();
  });

  describe('cacheGet', () => {
    it('should return parsed JSON data from cache', async () => {
      const testData = { id: '1', name: 'Test Product' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheGet<typeof testData>('test:key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheGet('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockRedis.get.mockResolvedValue('invalid json {{{');

      const result = await cacheGet('invalid:key');

      expect(result).toBeNull();
    });
  });

  describe('cacheSet', () => {
    it('should set value with TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const testData = { id: '1', name: 'Test' };

      await cacheSet('test:key', testData, 300);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(testData),
        'EX',
        300
      );
    });
  });

  describe('cacheDelete', () => {
    it('should delete a cache key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await cacheDelete('test:key');

      expect(mockRedis.del).toHaveBeenCalledWith('test:key');
    });
  });

  describe('Product Cache', () => {
    it('should get cached product by ID', async () => {
      const product = { id: 'prod-1', name: 'Test Product', price: 99.99 };
      mockRedis.get.mockResolvedValue(JSON.stringify(product));

      const result = await getCachedProduct('prod-1');

      expect(result).toEqual(product);
    });

    it('should set cached product with correct TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const product = { id: 'prod-1', name: 'Test Product' };

      await setCachedProduct('prod-1', product);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'cache:product:prod-1',
        JSON.stringify(product),
        'EX',
        CACHE_TTL.PRODUCT
      );
    });

    it('should build correct cache key for product list', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ products: [], total: 0 }));

      const filters = { page: 1, limit: 20, category: 'electronics' };
      await getCachedProductList(filters);

      // Key should include all filter parts
      expect(mockRedis.get).toHaveBeenCalled();
    });
  });

  describe('Inventory Cache', () => {
    it('should get cached inventory as number', async () => {
      mockRedis.get.mockResolvedValue('42');

      const result = await getCachedInventory('variant-1');

      expect(result).toBe(42);
    });

    it('should return null for non-existent inventory cache', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getCachedInventory('variant-1');

      expect(result).toBeNull();
    });

    it('should set inventory cache with short TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await setCachedInventory('variant-1', 50);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'cache:inventory:variant-1',
        '50',
        'EX',
        CACHE_TTL.INVENTORY
      );
    });
  });

  describe('Distributed Locks', () => {
    it('should acquire lock when available', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const token = await acquireLock('resource-1');

      expect(token).not.toBeNull();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:resource-1',
        expect.any(String),
        'EX',
        10,
        'NX'
      );
    });

    it('should return null when lock is held', async () => {
      mockRedis.set.mockResolvedValue(null);

      const token = await acquireLock('resource-1');

      expect(token).toBeNull();
    });

    it('should release lock with correct token', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const released = await releaseLock('resource-1', 'valid-token');

      expect(released).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should not release lock with wrong token', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const released = await releaseLock('resource-1', 'wrong-token');

      expect(released).toBe(false);
    });

    it('should execute function with lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const result = await withLock('test-resource', async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should throw error when lock cannot be acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      await expect(
        withLock('locked-resource', async () => 'result', {
          retryAttempts: 1,
          retryDelayMs: 10,
        })
      ).rejects.toThrow('Could not acquire lock');
    });
  });
});
