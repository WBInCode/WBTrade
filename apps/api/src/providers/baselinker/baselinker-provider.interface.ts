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
// Order Types for addOrder API
// ============================================

export interface BaselinkerOrderProduct {
  storage: 'db' | 'bl'; // db = external, bl = baselinker inventory
  storage_id: string;
  product_id?: string; // Baselinker product ID
  variant_id?: number;
  name: string;
  sku?: string;
  ean?: string;
  price_brutto: number;
  tax_rate?: number;
  quantity: number;
  weight?: number;
}

export interface BaselinkerAddOrderRequest {
  order_status_id: number;
  date_add?: number; // Unix timestamp
  currency?: string;
  payment_method?: string;
  payment_method_cod?: boolean;
  paid?: boolean;
  user_comments?: string;
  admin_comments?: string;
  email?: string;
  phone?: string;
  user_login?: string;
  delivery_method?: string;
  delivery_price?: number;
  delivery_fullname?: string;
  delivery_company?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postcode?: string;
  delivery_country_code?: string;
  delivery_point_id?: string;
  delivery_point_name?: string;
  delivery_point_address?: string;
  delivery_point_postcode?: string;
  delivery_point_city?: string;
  invoice_fullname?: string;
  invoice_company?: string;
  invoice_nip?: string;
  invoice_address?: string;
  invoice_city?: string;
  invoice_postcode?: string;
  invoice_country_code?: string;
  want_invoice?: boolean;
  extra_field_1?: string;
  extra_field_2?: string;
  custom_extra_fields?: Record<string, string>;
  products: BaselinkerOrderProduct[];
}

export interface BaselinkerAddOrderResponse {
  order_id: number;
}

// ============================================
// Order Response Types (for getOrders API)
// ============================================

export interface BaselinkerOrderResponse {
  order_id: number;
  shop_order_id?: number;
  external_order_id?: string;
  order_source?: string;
  order_source_id?: number;
  order_source_info?: string;
  order_status_id: number;
  date_add: number; // Unix timestamp
  date_confirmed?: number;
  date_in_status?: number;
  currency?: string;
  payment_method?: string;
  payment_done?: number;
  email?: string;
  phone?: string;
  delivery_method?: string;
  delivery_price?: number;
  delivery_fullname?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postcode?: string;
  delivery_country_code?: string;
  delivery_point_id?: string;
  delivery_point_name?: string;
  delivery_point_address?: string;
  invoice_fullname?: string;
  invoice_address?: string;
  invoice_city?: string;
  invoice_postcode?: string;
  invoice_nip?: string;
  products: Array<{
    product_id: number;
    variant_id?: number;
    name: string;
    sku?: string;
    ean?: string;
    price_brutto: number;
    quantity: number;
  }>;
}

export interface GetOrdersResponse {
  orders: BaselinkerOrderResponse[];
}

// ============================================
// Order Package Types (for getOrderPackages API)
// ============================================

export interface BaselinkerOrderPackage {
  package_id: number;
  courier_code: string;
  courier_package_nr: string;
  courier_other_name?: string;
  tracking_status?: number;
  tracking_link?: string;
  is_sent?: boolean;
  weight?: number;
}

export interface GetOrderPackagesResponse {
  packages: BaselinkerOrderPackage[];
}

export interface BaselinkerUpdateStockRequest {
  inventory_id: number;
  products: Record<string, Record<string, number>>; // { product_id: { warehouse_id: stock } }
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

  /**
   * Add order to Baselinker
   * This automatically decreases stock in Baselinker inventory
   * @param orderData - Order data to add
   */
  addOrder(orderData: BaselinkerAddOrderRequest): Promise<BaselinkerAddOrderResponse>;

  /**
   * Update stock levels for products in inventory
   * @param inventoryId - The inventory ID
   * @param products - Map of product_id to warehouse stock levels
   */
  updateInventoryProductsStock(
    inventoryId: string,
    products: Record<string, Record<string, number>>
  ): Promise<void>;

  /**
   * Set order status in Baselinker
   * @param orderId - Baselinker order ID
   * @param statusId - New status ID
   */
  setOrderStatus(orderId: string | number, statusId: number): Promise<void>;

  /**
   * Set order payment in Baselinker
   * @param orderId - Baselinker order ID
   * @param paymentDone - Amount paid
   * @param paymentDate - Payment date (unix timestamp)
   * @param paymentComment - Optional comment
   */
  setOrderPayment(
    orderId: string | number, 
    paymentDone: number, 
    paymentDate?: number,
    paymentComment?: string
  ): Promise<void>;

  /**
   * Get orders from Baselinker
   * @param params - Optional filters (date_from, status_id, etc.)
   */
  getOrders(params?: {
    date_from?: number;
    date_to?: number;
    status_id?: number;
    order_id?: number;
    filter_order_source_id?: number;
  }): Promise<BaselinkerOrderResponse[]>;

  /**
   * Get packages (shipments) for a specific order from Baselinker
   * @param orderId - Baselinker order ID
   */
  getOrderPackages(orderId: string | number): Promise<BaselinkerOrderPackage[]>;
}
