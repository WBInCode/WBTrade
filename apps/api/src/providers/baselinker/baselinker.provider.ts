/**
 * Baselinker REST API Provider
 * 
 * Implements connection to Baselinker API with:
 * - Rate limiting (token bucket algorithm)
 * - Automatic pagination
 * - Retry with exponential backoff
 * 
 * API Documentation: https://api.baselinker.com/
 */

import {
  IBaselinkerProvider,
  BaselinkerProviderConfig,
  BaselinkerInventory,
  BaselinkerCategory,
  BaselinkerProductListItem,
  BaselinkerProductData,
  BaselinkerStockEntry,
  BaselinkerApiResponse,
} from './baselinker-provider.interface';

const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 100;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const PRODUCTS_PER_PAGE = 1000;

/**
 * Token Bucket Rate Limiter
 */
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;

  constructor(maxRequestsPerMinute: number) {
    this.maxTokens = maxRequestsPerMinute;
    this.tokens = maxRequestsPerMinute;
    this.refillRate = maxRequestsPerMinute / 60000; // tokens per ms
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }
}

/**
 * Baselinker API Provider Implementation
 */
export class BaselinkerProvider implements IBaselinkerProvider {
  private config: BaselinkerProviderConfig;
  private rateLimiter: RateLimiter;

  constructor(config: BaselinkerProviderConfig) {
    this.config = {
      ...config,
      maxRequestsPerMinute:
        config.maxRequestsPerMinute ?? DEFAULT_MAX_REQUESTS_PER_MINUTE,
      retryAttempts: config.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS,
      retryDelayMs: config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    };

    this.rateLimiter = new RateLimiter(this.config.maxRequestsPerMinute!);
  }

  /**
   * Make API request to Baselinker
   */
  private async request<T>(
    method: string,
    parameters: Record<string, any> = {}
  ): Promise<T> {
    await this.rateLimiter.acquire();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        const formData = new URLSearchParams();
        formData.append('method', method);
        formData.append('parameters', JSON.stringify(parameters));

        const response = await fetch(BASELINKER_API_URL, {
          method: 'POST',
          headers: {
            'X-BLToken': this.config.apiToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          console.warn(`Baselinker rate limited. Waiting ${retryAfter}s...`);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Handle server errors with retry
        if (response.status >= 500) {
          const delay = this.config.retryDelayMs! * Math.pow(2, attempt);
          console.warn(`Baselinker server error ${response.status}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        const data: BaselinkerApiResponse<T> = await response.json();

        if (data.status === 'ERROR') {
          throw new BaselinkerApiError(
            data.error_message || 'Unknown Baselinker error',
            data.error_code || 'UNKNOWN'
          );
        }

        // Baselinker returns data directly in response, not wrapped in 'data' field
        // The response itself is the data we need (after status check)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { status, error_code, error_message, ...responseData } = data as any;
        return responseData as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on API errors (invalid token, bad request, etc.)
        if (error instanceof BaselinkerApiError) {
          throw error;
        }

        // Retry on network errors
        if (attempt < this.config.retryAttempts! - 1) {
          const delay = this.config.retryDelayMs! * Math.pow(2, attempt);
          console.warn(`Baselinker request failed. Retrying in ${delay}ms...`, error);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Baselinker request failed after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all available inventories
   */
  async getInventories(): Promise<BaselinkerInventory[]> {
    const response = await this.request<{ inventories: BaselinkerInventory[] }>(
      'getInventories'
    );
    return response.inventories || [];
  }

  /**
   * Get categories for an inventory
   */
  async getInventoryCategories(inventoryId: string): Promise<BaselinkerCategory[]> {
    const response = await this.request<{ categories: Record<string, BaselinkerCategory> }>(
      'getInventoryCategories',
      { inventory_id: parseInt(inventoryId, 10) }
    );

    // Convert object to array
    return Object.entries(response.categories || {}).map(([id, category]) => ({
      ...category,
      category_id: parseInt(id, 10),
    }));
  }

  /**
   * Get paginated list of products
   */
  async getInventoryProductsList(
    inventoryId: string,
    page: number = 1
  ): Promise<{ products: BaselinkerProductListItem[]; hasMore: boolean }> {
    const response = await this.request<{ products: Record<string, BaselinkerProductListItem> }>(
      'getInventoryProductsList',
      {
        inventory_id: parseInt(inventoryId, 10),
        page,
      }
    );

    const products = Object.entries(response.products || {}).map(([id, product]) => ({
      ...product,
      id: parseInt(id, 10),
    }));

    return {
      products,
      hasMore: products.length === PRODUCTS_PER_PAGE,
    };
  }

  /**
   * Get all products with automatic pagination
   */
  async getAllInventoryProducts(
    inventoryId: string
  ): Promise<BaselinkerProductListItem[]> {
    const allProducts: BaselinkerProductListItem[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getInventoryProductsList(inventoryId, page);
      allProducts.push(...result.products);
      hasMore = result.hasMore;
      page++;
    }

    return allProducts;
  }

  /**
   * Get detailed product data for specific product IDs
   */
  async getInventoryProductsData(
    inventoryId: string,
    productIds: number[]
  ): Promise<BaselinkerProductData[]> {
    if (productIds.length === 0) {
      return [];
    }

    // Baselinker limits to 1000 products per request
    const chunks = this.chunkArray(productIds, 1000);
    const allProducts: BaselinkerProductData[] = [];

    for (const chunk of chunks) {
      const response = await this.request<{ products: Record<string, BaselinkerProductData> }>(
        'getInventoryProductsData',
        {
          inventory_id: parseInt(inventoryId, 10),
          products: chunk,
        }
      );

      const products = Object.entries(response.products || {}).map(([id, product]) => ({
        ...product,
        id: parseInt(id, 10),
      }));

      allProducts.push(...products);
    }

    return allProducts;
  }

  /**
   * Get stock levels for all products in inventory
   */
  async getInventoryProductsStock(inventoryId: string): Promise<BaselinkerStockEntry[]> {
    const allStock: BaselinkerStockEntry[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request<{ products: Record<string, any> }>(
        'getInventoryProductsStock',
        {
          inventory_id: parseInt(inventoryId, 10),
          page,
        }
      );

      const entries = Object.entries(response.products || {}).map(([id, data]) => ({
        product_id: parseInt(id, 10),
        variant_id: 0,
        stock: data.stock || {},
        reservations: data.reservations || {},
      }));

      allStock.push(...entries);
      hasMore = entries.length === PRODUCTS_PER_PAGE;
      page++;
    }

    return allStock;
  }

  /**
   * Test connection to Baselinker API
   */
  async testConnection(): Promise<boolean> {
    try {
      const inventories = await this.getInventories();
      return Array.isArray(inventories);
    } catch (error) {
      console.error('Baselinker connection test failed:', error);
      return false;
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Custom error class for Baselinker API errors
 */
export class BaselinkerApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BaselinkerApiError';
    this.code = code;
  }
}
