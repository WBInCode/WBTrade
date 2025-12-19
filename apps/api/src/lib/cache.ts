/**
 * Cache Service using Redis
 * Handles caching for products, inventory, sessions, and other data
 */

import { getRedisClient } from './redis';

// Cache prefixes
const CACHE_PREFIX = {
  PRODUCT: 'cache:product:',
  PRODUCT_LIST: 'cache:products:',
  PRODUCT_SLUG: 'cache:product:slug:',
  INVENTORY: 'cache:inventory:',
  CATEGORY: 'cache:category:',
  CATEGORY_TREE: 'cache:categories:tree',
  USER_SESSION: 'cache:session:user:',
};

// TTL constants (in seconds)
export const CACHE_TTL = {
  PRODUCT: 5 * 60, // 5 minutes
  PRODUCT_LIST: 3 * 60, // 3 minutes (changes more frequently)
  INVENTORY: 60, // 1 minute (needs to be fresh)
  CATEGORY: 15 * 60, // 15 minutes (rarely changes)
  CATEGORY_TREE: 30 * 60, // 30 minutes
  SESSION: 30 * 60, // 30 minutes
};

/**
 * Generic cache get
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  const data = await redis.get(key);
  
  if (!data) return null;
  
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Generic cache set
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

/**
 * Delete single cache key
 */
export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

/**
 * Delete multiple cache keys by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const redis = getRedisClient();
  const keys = await redis.keys(pattern);
  
  if (keys.length === 0) return 0;
  
  await redis.del(...keys);
  return keys.length;
}

// ========================================
// Product Cache
// ========================================

/**
 * Get cached product by ID
 */
export async function getCachedProduct<T>(productId: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIX.PRODUCT}${productId}`);
}

/**
 * Set cached product
 */
export async function setCachedProduct<T>(productId: string, product: T): Promise<void> {
  await cacheSet(`${CACHE_PREFIX.PRODUCT}${productId}`, product, CACHE_TTL.PRODUCT);
}

/**
 * Get cached product by slug
 */
export async function getCachedProductBySlug<T>(slug: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIX.PRODUCT_SLUG}${slug}`);
}

/**
 * Set cached product by slug
 */
export async function setCachedProductBySlug<T>(slug: string, product: T): Promise<void> {
  await cacheSet(`${CACHE_PREFIX.PRODUCT_SLUG}${slug}`, product, CACHE_TTL.PRODUCT);
}

/**
 * Build product list cache key from filters
 */
function buildProductListKey(filters: Record<string, unknown>): string {
  const sortedKeys = Object.keys(filters).sort();
  const parts = sortedKeys.map((k) => `${k}:${filters[k]}`);
  return `${CACHE_PREFIX.PRODUCT_LIST}${parts.join('|')}`;
}

/**
 * Get cached product list
 */
export async function getCachedProductList<T>(
  filters: Record<string, unknown>
): Promise<T | null> {
  const key = buildProductListKey(filters);
  return cacheGet<T>(key);
}

/**
 * Set cached product list
 */
export async function setCachedProductList<T>(
  filters: Record<string, unknown>,
  data: T
): Promise<void> {
  const key = buildProductListKey(filters);
  await cacheSet(key, data, CACHE_TTL.PRODUCT_LIST);
}

/**
 * Invalidate all product caches
 */
export async function invalidateProductCache(productId?: string): Promise<void> {
  if (productId) {
    // Invalidate specific product
    await cacheDelete(`${CACHE_PREFIX.PRODUCT}${productId}`);
    // Also need to invalidate product lists that might contain this product
  }
  // Invalidate all product lists
  await cacheDeletePattern(`${CACHE_PREFIX.PRODUCT_LIST}*`);
}

/**
 * Invalidate product by slug
 */
export async function invalidateProductBySlug(slug: string): Promise<void> {
  await cacheDelete(`${CACHE_PREFIX.PRODUCT_SLUG}${slug}`);
}

// ========================================
// Inventory Cache
// ========================================

/**
 * Get cached inventory for variant
 */
export async function getCachedInventory(variantId: string): Promise<number | null> {
  const redis = getRedisClient();
  const key = `${CACHE_PREFIX.INVENTORY}${variantId}`;
  const data = await redis.get(key);
  return data ? parseInt(data, 10) : null;
}

/**
 * Set cached inventory
 */
export async function setCachedInventory(
  variantId: string,
  availableStock: number
): Promise<void> {
  const redis = getRedisClient();
  const key = `${CACHE_PREFIX.INVENTORY}${variantId}`;
  await redis.set(key, availableStock.toString(), 'EX', CACHE_TTL.INVENTORY);
}

/**
 * Invalidate inventory cache for variant
 */
export async function invalidateInventoryCache(variantId?: string): Promise<void> {
  if (variantId) {
    await cacheDelete(`${CACHE_PREFIX.INVENTORY}${variantId}`);
  } else {
    await cacheDeletePattern(`${CACHE_PREFIX.INVENTORY}*`);
  }
}

// ========================================
// Category Cache
// ========================================

/**
 * Get cached category
 */
export async function getCachedCategory<T>(categoryId: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIX.CATEGORY}${categoryId}`);
}

/**
 * Set cached category
 */
export async function setCachedCategory<T>(categoryId: string, category: T): Promise<void> {
  await cacheSet(`${CACHE_PREFIX.CATEGORY}${categoryId}`, category, CACHE_TTL.CATEGORY);
}

/**
 * Get cached category tree
 */
export async function getCachedCategoryTree<T>(): Promise<T | null> {
  return cacheGet<T>(CACHE_PREFIX.CATEGORY_TREE);
}

/**
 * Set cached category tree
 */
export async function setCachedCategoryTree<T>(tree: T): Promise<void> {
  await cacheSet(CACHE_PREFIX.CATEGORY_TREE, tree, CACHE_TTL.CATEGORY_TREE);
}

/**
 * Invalidate all category caches
 */
export async function invalidateCategoryCache(): Promise<void> {
  await cacheDelete(CACHE_PREFIX.CATEGORY_TREE);
  await cacheDeletePattern(`${CACHE_PREFIX.CATEGORY}*`);
}

// ========================================
// Distributed Locks
// ========================================

const LOCK_PREFIX = 'lock:';
const DEFAULT_LOCK_TTL = 10; // 10 seconds

/**
 * Acquire a distributed lock
 * Returns lock token if acquired, null if lock is held
 */
export async function acquireLock(
  resource: string,
  ttlSeconds: number = DEFAULT_LOCK_TTL
): Promise<string | null> {
  const redis = getRedisClient();
  const key = `${LOCK_PREFIX}${resource}`;
  const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Use SET NX (set if not exists) with expiry
  const result = await redis.set(key, token, 'EX', ttlSeconds, 'NX');
  
  return result === 'OK' ? token : null;
}

/**
 * Release a distributed lock
 * Only releases if token matches (prevents releasing someone else's lock)
 */
export async function releaseLock(resource: string, token: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${LOCK_PREFIX}${resource}`;
  
  // Lua script to atomically check and delete
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  
  const result = await redis.eval(script, 1, key, token);
  return result === 1;
}

/**
 * Extend lock TTL
 */
export async function extendLock(
  resource: string,
  token: string,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${LOCK_PREFIX}${resource}`;
  
  // Lua script to atomically check and extend
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("expire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  
  const result = await redis.eval(script, 1, key, token, ttlSeconds);
  return result === 1;
}

/**
 * Execute with lock - helper for running code with a distributed lock
 */
export async function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  options: {
    ttlSeconds?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
  } = {}
): Promise<T> {
  const { ttlSeconds = 10, retryAttempts = 3, retryDelayMs = 100 } = options;
  
  let token: string | null = null;
  let attempts = 0;
  
  // Try to acquire lock with retries
  while (!token && attempts < retryAttempts) {
    token = await acquireLock(resource, ttlSeconds);
    if (!token) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempts));
    }
  }
  
  if (!token) {
    throw new Error(`Could not acquire lock for resource: ${resource}`);
  }
  
  try {
    return await fn();
  } finally {
    await releaseLock(resource, token);
  }
}

// ========================================
// Cache Stats
// ========================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  productKeys: number;
  inventoryKeys: number;
  categoryKeys: number;
  sessionKeys: number;
}> {
  const redis = getRedisClient();
  
  const [productKeys, inventoryKeys, categoryKeys, sessionKeys] = await Promise.all([
    redis.keys(`${CACHE_PREFIX.PRODUCT}*`),
    redis.keys(`${CACHE_PREFIX.INVENTORY}*`),
    redis.keys(`${CACHE_PREFIX.CATEGORY}*`),
    redis.keys(`${CACHE_PREFIX.USER_SESSION}*`),
  ]);
  
  return {
    productKeys: productKeys.length,
    inventoryKeys: inventoryKeys.length,
    categoryKeys: categoryKeys.length,
    sessionKeys: sessionKeys.length,
  };
}
