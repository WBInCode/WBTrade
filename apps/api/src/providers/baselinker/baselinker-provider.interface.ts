/**
 * Baselinker Provider Interface
 * Defines the contract for Baselinker API integration
 */

// ============================================
// Request/Response Types
// ============================================

export interface BaselinkerInventory {
  inventory_id: number;
  name: string;
  description: string;
  languages: string[];
  default_language: string;
  price_groups: number[];
  default_price_group: number;
  warehouses: string[];
  default_warehouse: string;
  reservations: boolean;
}

export interface BaselinkerCategory {
  category_id: number;
  name: string;
  parent_id: number;
}

export interface BaselinkerProductTextField {
  name?: string;
  description?: string;
  description_extra1?: string;
  description_extra2?: string;
  description_extra3?: string;
  description_extra4?: string;
  [key: string]: string | undefined;
}

export interface BaselinkerProductData {
  id: number;
  ean: string;
  sku: string;
  name: string;
  quantity: number;
  price_brutto: number;
  price_wholesale_netto?: number;
  tax_rate: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  category_id: number;
  manufacturer_id?: number;
  images: Record<string, string>; // { "0": "url1", "1": "url2", ... }
  features: Record<string, string>; // Product features/attributes
  tags?: string[]; // Product tags
  variants?: BaselinkerVariantData[];
  text_fields: Record<string, BaselinkerProductTextField>; // Keyed by language
  average_cost?: number;
  is_bundle?: boolean;
  bundle_products?: Record<string, number>; // { product_id: quantity }
  locations?: Record<string, string>; // { warehouse_id: location }
}

export interface BaselinkerVariantData {
  variant_id: number;
  name: string;
  sku: string;
  ean: string;
  price_brutto: number;
  quantity: number;
}

export interface BaselinkerProductListItem {
  id: number;
  ean: string;
  sku: string;
  name: string;
  quantity: number;
  price_brutto: number;
}

export interface BaselinkerStockEntry {
  product_id: number;
  variant_id: number;
  stock: Record<string, number>; // { warehouse_id: quantity }
  reservations: Record<string, number>; // { warehouse_id: reserved }
}

export interface BaselinkerImage {
  url: string;
  order: number;
}

// ============================================
// API Response Wrappers
// ============================================

export interface BaselinkerApiResponse<T = unknown> {
  status: 'SUCCESS' | 'ERROR';
  error_code?: string;
  error_message?: string;
  data?: T;
}

export interface GetInventoriesResponse {
  inventories: BaselinkerInventory[];
}

export interface GetCategoriesResponse {
  categories: BaselinkerCategory[];
}

export interface GetProductsListResponse {
  products: Record<string, BaselinkerProductListItem>;
}

export interface GetProductsDataResponse {
  products: Record<string, BaselinkerProductData>;
}

export interface GetProductsStockResponse {
  products: Record<string, BaselinkerStockEntry>;
}

// ============================================
// Provider Configuration
// ============================================

export interface BaselinkerProviderConfig {
  apiToken: string;
  inventoryId: string;
  maxRequestsPerMinute?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

// ============================================
// Provider Interface
// ============================================

export interface IBaselinkerProvider {
  /**
   * Get all available inventories
   */
  getInventories(): Promise<BaselinkerInventory[]>;

  /**
   * Get categories for an inventory
   * @param inventoryId - The inventory ID to get categories from
   */
  getInventoryCategories(inventoryId: string): Promise<BaselinkerCategory[]>;

  /**
   * Get paginated list of products (basic info only)
   * @param inventoryId - The inventory ID
   * @param page - Page number (optional, for pagination)
   */
  getInventoryProductsList(
    inventoryId: string,
    page?: number
  ): Promise<{ products: BaselinkerProductListItem[]; hasMore: boolean }>;

  /**
   * Get detailed product data for specific product IDs
   * @param inventoryId - The inventory ID
   * @param productIds - Array of product IDs to fetch
   */
  getInventoryProductsData(
    inventoryId: string,
    productIds: number[]
  ): Promise<BaselinkerProductData[]>;

  /**
   * Get stock levels for all products in inventory
   * @param inventoryId - The inventory ID
   */
  getInventoryProductsStock(
    inventoryId: string
  ): Promise<BaselinkerStockEntry[]>;

  /**
   * Test connection to Baselinker API
   */
  testConnection(): Promise<boolean>;
}
