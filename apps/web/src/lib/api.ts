/**
 * API Client for WBTrade Web Application
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'wbtrade.pl'
    ? 'https://wbtrade-iv71.onrender.com/api'
    : 'http://localhost:5000/api');

// Types for API responses
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// Custom error class for API errors
export class ApiClientError extends Error {
  public statusCode: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// Request configuration
interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

// Build URL with query parameters
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

// Get auth token from storage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        return parsed.accessToken || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Get refresh token from storage
function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        return parsed.refreshToken || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Attempt to refresh the access token
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        // Save new tokens with timestamp for proper expiry tracking
        const tokensWithTimestamp = {
          ...data.tokens,
          issuedAt: Date.now(),
        };
        localStorage.setItem('auth_tokens', JSON.stringify(tokensWithTimestamp));
        return true;
      }
      
      // Refresh failed - clear tokens
      localStorage.removeItem('auth_tokens');
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Base fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  config: RequestConfig = {},
  retryAfterRefresh = true
): Promise<T> {
  const { params, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);
  
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...config.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  // Add session ID for checkout operations (cart merging)
  if (typeof window !== 'undefined') {
    const sessionId = localStorage.getItem('cart_session_id');
    if (sessionId) {
      (headers as Record<string, string>)['X-Session-Id'] = sessionId;
    }
  }
  
  try {
    const response = await fetch(url, {
      ...fetchConfig,
      headers,
    });
    
    // Handle no content response
    if (response.status === 204) {
      return {} as T;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      // If 401 and we have a refresh token, try to refresh and retry.
      // Backend may respond with just "Invalid token" for expired tokens (or when JWT_SECRET changes),
      // so we refresh on any 401 (once) instead of relying only on data.code.
      if (response.status === 401 && retryAfterRefresh) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Retry the original request with new token
          return fetchApi<T>(endpoint, config, false);
        }

        // Refresh failed - clear tokens & redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_tokens');
          window.location.href = '/login?expired=true';
        }
      }
      
      throw new ApiClientError(
        data.message || data.error || 'An error occurred',
        response.status,
        data.errors
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    
    // Network error or other issues
    throw new ApiClientError(
      'Network error. Please check your connection.',
      0
    );
  }
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    fetchApi<T>(endpoint, { method: 'GET', params }),
    
  post: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
    
  put: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
    
  patch: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
    
  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};

// ============================================
// PRODUCTS API
// ============================================

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  specifications?: Record<string, string>;
  price: string | number;
  compareAtPrice?: string | number;
  lowestPrice30Days?: string | number; // Omnibus - najniższa cena z ostatnich 30 dni
  lowestPrice30DaysAt?: string; // Kiedy odnotowano najniższą cenę
  sku?: string;
  barcode?: string;
  status: 'active' | 'draft' | 'archived';
  images?: ProductImage[];
  variants?: ProductVariant[];
  category?: Category;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  // Extended fields for UI
  badge?: 'super-price' | 'outlet' | 'bestseller' | 'new';
  rating?: string | number;
  reviewCount?: number;
  storeName?: string;
  deliveryInfo?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  lowestPrice30Days?: number; // Omnibus - najniższa cena z ostatnich 30 dni
  stock: number;
  attributes: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  image?: string;
}

export interface ProductsListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'price-asc' | 'price-desc' | 'name_asc' | 'name_desc' | 'newest' | 'random' | 'relevance' | 'popularity';
  status?: 'active' | 'draft' | 'archived';
  brand?: string;
  [key: string]: string | number | boolean | undefined; // Allow dynamic specification filters
}

export interface ProductFiltersResponse {
  priceRange: {
    min: number;
    max: number;
  };
  brands: { name: string; count: number }[];
  specifications: Record<string, { value: string; count: number }[]>;
  totalProducts: number;
}

export const productsApi = {
  getAll: (filters?: ProductFilters) =>
    api.get<ProductsListResponse>('/products', filters as Record<string, string | number | boolean>),
    
  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),
    
  getBySlug: (slug: string) =>
    api.get<Product>(`/products/slug/${slug}`),
  
  getFilters: (category?: string) =>
    api.get<ProductFiltersResponse>('/products/filters', category ? { category } : undefined),
    
  create: (product: Partial<Product>) =>
    api.post<Product>('/products', product),
    
  update: (id: string, product: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, product),
    
  delete: (id: string) =>
    api.delete<void>(`/products/${id}`),

  // Get bestsellers based on actual sales data
  getBestsellers: (options?: { limit?: number; category?: string; days?: number }) =>
    api.get<{ products: Product[] }>('/products/bestsellers', options as Record<string, string | number | boolean>),

  // Get featured products (admin-curated or fallback)
  getFeatured: (options?: { limit?: number; productIds?: string[] }) => {
    const params: Record<string, string | number | boolean> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.productIds) params.productIds = options.productIds.join(',');
    return api.get<{ products: Product[] }>('/products/featured', params);
  },

  // Get seasonal products
  getSeasonal: (options?: { limit?: number; season?: 'spring' | 'summer' | 'autumn' | 'winter' }) =>
    api.get<{ products: Product[] }>('/products/seasonal', options as Record<string, string | number | boolean>),

  // Get new products (added in last X days)
  getNewProducts: (options?: { limit?: number; days?: number }) =>
    api.get<{ products: Product[] }>('/products/new-arrivals', options as Record<string, string | number | boolean>),

  // Get products from the same warehouse (for "Zamów w jednej przesyłce")
  getSameWarehouseProducts: (productId: string, options?: { limit?: number }) =>
    api.get<{ products: Product[]; wholesaler: string | null }>(
      `/products/same-warehouse/${productId}`, 
      options as Record<string, string | number | boolean>
    ),
};

// ============================================
// CATEGORIES API
// ============================================

export interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image: string | null;
  order: number;
  isActive: boolean;
  children?: CategoryWithChildren[];
  productCount?: number;
}

export interface CategoriesListResponse {
  categories: CategoryWithChildren[];
}

export interface CategoryResponse {
  category: CategoryWithChildren;
}

export interface CategoryPathResponse {
  path: { id: string; name: string; slug: string }[];
}

export const categoriesApi = {
  // Get all categories in tree structure
  getAll: () =>
    api.get<CategoriesListResponse>('/categories'),
  
  // Get main (root) categories only  
  getMain: () =>
    api.get<CategoriesListResponse>('/categories/main'),
    
  // Get category by slug with children
  getBySlug: (slug: string) =>
    api.get<CategoryResponse>(`/categories/${slug}`),
    
  // Get category breadcrumb path
  getPath: (slug: string) =>
    api.get<CategoryPathResponse>(`/categories/${slug}/path`),
};

// ============================================
// ORDERS API
// ============================================

export interface OrderAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variant?: {
    id: string;
    name: string;
    product: {
      id: string;
      name: string;
      slug: string;
      images: { url: string; alt: string | null }[];
    };
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus?: 'PENDING' | 'AWAITING_CONFIRMATION' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  items: OrderItem[];
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  shippingMethod: string;
  paymentMethod: string;
  paczkomatCode?: string;
  paczkomatAddress?: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  shippingMethod: string;
  paymentMethod: string;
  notes?: string;
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export const ordersApi = {
  create: (orderData: CreateOrderData) =>
    api.post<Order>('/orders', orderData),
    
  getAll: (page?: number, limit?: number) =>
    api.get<OrdersListResponse>('/orders', { page, limit }),
    
  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`),
    
  cancel: (id: string) =>
    api.delete<{ message: string }>(`/orders/${id}`),
};

// ============================================
// SEARCH API
// ============================================

export interface SearchResult {
  products: Product[];
  total: number;
  facets?: {
    categories: { name: string; count: number }[];
    priceRanges: { min: number; max: number; count: number }[];
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'product' | 'category' | 'query';
  product?: Product;
  category?: Category;
}

export const searchApi = {
  search: (query: string, filters?: ProductFilters) =>
    api.get<SearchResult>('/search', { query, ...filters } as Record<string, string | number | boolean>),
    
  suggest: (query: string) =>
    api.get<SearchSuggestion[]>('/search/suggest', { query }),
};

// ============================================
// AUTH API
// ============================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'admin' | 'warehouse';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data),
    
  login: (data: LoginData) =>
    api.post<AuthResponse>('/auth/login', data),
    
  logout: () =>
    api.post<void>('/auth/logout'),
    
  refreshToken: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),
    
  forgotPassword: (email: string) =>
    api.post<void>('/auth/forgot-password', { email }),
    
  resetPassword: (token: string, password: string) =>
    api.post<void>('/auth/reset-password', { token, password }),
    
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { currentPassword, newPassword }),
    
  getProfile: () =>
    api.get<User>('/auth/profile'),
    
  updateProfile: (data: Partial<User>) =>
    api.patch<User>('/auth/profile', data),
};

// ============================================
// USER ADDRESSES API
// ============================================

export type AddressType = 'SHIPPING' | 'BILLING';

export interface Address {
  id: string;
  userId: string;
  label?: string;
  type: AddressType;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressData {
  label?: string;
  type?: AddressType;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

export const addressesApi = {
  getAll: () =>
    api.get<Address[]>('/addresses'),
  
  getByType: (type: AddressType) =>
    api.get<Address[]>(`/addresses?type=${type}`),
    
  create: (address: CreateAddressData) =>
    api.post<Address>('/addresses', address),
    
  update: (id: string, address: Partial<CreateAddressData>) =>
    api.put<Address>(`/addresses/${id}`, address),
    
  delete: (id: string) =>
    api.delete<void>(`/addresses/${id}`),
    
  setDefault: (id: string) =>
    api.post<Address>(`/addresses/${id}/default`),
};

// ============================================
// CART API
// ============================================

export interface CartItem {
  id: string;
  quantity: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice: number | null;
    attributes: Record<string, string>;
    product: {
      id: string;
      name: string;
      slug: string;
      images: { url: string; alt: string | null }[];
      tags?: string[];
      wholesaler?: string | null;
    };
    inventory: { quantity: number; reserved: number }[];
  };
}

export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string | null;
  couponCode: string | null;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
}

// Get or generate session ID for guest users
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

// Get user ID if logged in
function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_id');
}

// Custom fetch for cart with session/user headers
async function cartFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const sessionId = getSessionId();
  const userId = getUserId();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Błąd podczas operacji na koszyku');
  }
  
  const data = await response.json();
  return data.data;
}

export const cartApi = {
  // Get current cart
  getCart: () => cartFetch<Cart>('/cart'),
  
  // Add item to cart
  addItem: (variantId: string, quantity: number = 1) =>
    cartFetch<Cart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity }),
    }),
  
  // Update item quantity
  updateItem: (itemId: string, quantity: number) =>
    cartFetch<Cart>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  
  // Remove item from cart
  removeItem: (itemId: string) =>
    cartFetch<Cart>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    }),
  
  // Clear cart
  clearCart: () =>
    cartFetch<Cart>('/cart', {
      method: 'DELETE',
    }),
  
  // Apply coupon
  applyCoupon: (code: string) =>
    cartFetch<Cart>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  
  // Remove coupon
  removeCoupon: () =>
    cartFetch<Cart>('/cart/coupon', {
      method: 'DELETE',
    }),
  
  // Merge guest cart after login
  mergeCarts: (sessionId: string) =>
    cartFetch<Cart>('/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
};

// ============================================
// WISHLIST API
// ============================================

export interface WishlistItem {
  id: string;
  productId: string;
  variantId: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    images: { url: string; alt: string | null }[];
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
  } | null;
}

export interface WishlistResponse {
  items: WishlistItem[];
  count: number;
}

export const wishlistApi = {
  // Get user's wishlist
  getWishlist: () =>
    api.get<WishlistResponse>('/wishlist'),
  
  // Add product to wishlist
  addToWishlist: (productId: string, variantId?: string) =>
    api.post<WishlistItem>('/wishlist', { productId, variantId }),
  
  // Remove product from wishlist
  removeFromWishlist: (productId: string) =>
    api.delete<void>(`/wishlist/${productId}`),
  
  // Check if product is in wishlist
  checkWishlist: (productId: string) =>
    api.get<{ inWishlist: boolean }>(`/wishlist/check/${productId}`),
  
  // Clear wishlist
  clearWishlist: () =>
    api.delete<void>('/wishlist'),
  
  // Merge local wishlist with user's wishlist (after login)
  mergeWishlist: (items: { productId: string; variantId?: string }[]) =>
    api.post<WishlistResponse>('/wishlist/merge', { items }),
};

// ============================================
// CHECKOUT API
// ============================================

export interface ShippingMethod {
  id: string;
  serviceType: string;
  name: string;
  price: number;
  currency: string;
  estimatedDelivery: string;
  pickupPointRequired: boolean;
}

export interface PickupPoint {
  id: string;
  code: string;
  name: string;
  type: 'paczkomat' | 'punkt' | 'pop';
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  fee: number;
  feeType: 'fixed' | 'percentage';
  description?: string;
}

export interface PackageShippingRequest {
  packageId: string;
  method: string;
  price: number;
  paczkomatCode?: string;
  paczkomatAddress?: string;
  useCustomAddress?: boolean;
  customAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
  };
  items?: {
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity: number;
    image?: string;
  }[];
}

export interface CheckoutRequest {
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethod: string;
  pickupPointCode?: string;
  pickupPointAddress?: string;
  paymentMethod: string;
  customerNotes?: string;
  acceptTerms: boolean;
  packageShipping?: PackageShippingRequest[];
  // Guest checkout fields
  guestEmail?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  guestAddress?: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    differentBillingAddress?: boolean;
    billingAddress?: {
      firstName: string;
      lastName: string;
      companyName?: string;
      nip?: string;
      street: string;
      city: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
  };
}

export interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentUrl?: string;
  sessionId?: string;
  paymentMethod: string;
  total: number;
  redirectUrl?: string;
}

export interface PaymentVerifyResponse {
  status: string;
  orderId: string;
  transactionId?: string;
  paidAt?: string;
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface TrackingResponse {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export const checkoutApi = {
  // Get available shipping methods
  getShippingMethods: (postalCode: string, city?: string) =>
    api.get<{ shippingMethods: ShippingMethod[] }>('/checkout/shipping/methods', { 
      postalCode, 
      city 
    }),
  
  // Calculate shipping for current cart (includes gabaryt pricing)
  calculateCartShipping: () =>
    api.get<{ 
      shippingMethods: Array<{
        id: string;
        name: string;
        price: number;
        currency: string;
        available: boolean;
        message?: string;
        forced?: boolean;
      }>;
      calculation: {
        totalPackages: number;
        totalPaczkomatPackages: number;
        isPaczkomatAvailable: boolean;
        breakdown: Array<{ description: string; cost: number; packageCount: number }>;
        warnings: string[];
      };
    }>('/checkout/shipping/calculate'),
  
  // Calculate shipping for provided items (alternative to cart-based)
  calculateItemsShipping: (items: Array<{ variantId: string; quantity: number }>) =>
    api.post<{ 
      shippingMethods: Array<{
        id: string;
        name: string;
        price: number;
        currency: string;
        available: boolean;
        message?: string;
        forced?: boolean;
      }>;
      calculation: {
        totalPackages: number;
        totalPaczkomatPackages: number;
        isPaczkomatAvailable: boolean;
        breakdown: Array<{ description: string; cost: number; packageCount: number }>;
        warnings: string[];
      };
    }>('/checkout/shipping/calculate', { items }),
  
  // Get shipping options per package (for per-product shipping selection)
  getShippingPerPackage: (items: Array<{ variantId: string; quantity: number }>) =>
    api.post<{
      packagesWithOptions: Array<{
        package: {
          id: string;
          type: 'standard' | 'gabaryt';
          wholesaler: string | null;
          items: Array<{
            productId: string;
            productName: string;
            variantId: string;
            quantity: number;
            isGabaryt: boolean;
            productImage?: string;
          }>;
          isPaczkomatAvailable: boolean;
          isInPostOnly: boolean;
          isCourierOnly: boolean;
        };
        shippingMethods: Array<{
          id: string;
          name: string;
          price: number;
          available: boolean;
          message?: string;
          estimatedDelivery: string;
        }>;
        selectedMethod: string;
      }>;
      totalShippingCost: number;
      warnings: string[];
    }>('/checkout/shipping/per-package', { items }),
  
  // Get pickup points (Paczkomaty)
  getPickupPoints: (postalCode: string, city?: string, limit?: number) =>
    api.get<{ pickupPoints: PickupPoint[] }>('/checkout/shipping/pickup-points', { 
      postalCode, 
      city, 
      limit 
    }),
  
  // Get available payment methods
  getPaymentMethods: () =>
    api.get<{ paymentMethods: PaymentMethod[] }>('/checkout/payment/methods'),
  
  // Create checkout and initiate payment
  createCheckout: (data: CheckoutRequest) =>
    api.post<CheckoutResponse>('/checkout', data),
  
  // Verify payment after redirect
  verifyPayment: (sessionId: string) =>
    api.get<PaymentVerifyResponse>(`/checkout/payment/verify/${sessionId}`),
  
  // Retry payment for unpaid order - creates new PayU session
  retryPayment: (orderId: string) =>
    api.post<{ 
      success: boolean; 
      paymentUrl: string; 
      sessionId: string; 
      orderId: string; 
      orderNumber: string; 
    }>(`/checkout/payment/retry/${orderId}`, {}),
  
  // Get order tracking info
  getTracking: (orderId: string) =>
    api.get<TrackingResponse>(`/checkout/tracking/${orderId}`),
};

// ============================================
// DASHBOARD API
// ============================================

export interface DashboardStats {
  unpaidOrders: number;
  inTransitOrders: number;
  unreadMessages: number;
  loyaltyPoints: number;
}

export interface DashboardOrder {
  id: string;
  orderNumber: string;
  name: string;
  image: string | null;
  itemsCount: number;
  orderDate: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  total: number;
  currency: string;
}

export interface DashboardOverviewResponse {
  stats: DashboardStats;
  recentOrders: DashboardOrder[];
}

export interface RecommendedProduct {
  id: string;
  name: string;
  slug?: string;
  price: number;
  compareAtPrice?: number | null;
  images: ProductImage[];
  category?: { id: string; name: string } | null;
  reason: 'search' | 'category' | 'popular' | 'similar' | 'bestseller';
}

export interface RecommendationsResponse {
  recommendations: RecommendedProduct[];
}

export interface SimulatePaymentResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
  };
  message: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  categoryId: string | null;
  resultsCount: number;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
}

export const dashboardApi = {
  // Get dashboard overview with stats and recent orders
  getOverview: () =>
    api.get<DashboardOverviewResponse>('/dashboard'),
  
  // Get personalized product recommendations
  getRecommendations: (limit?: number) =>
    api.get<RecommendationsResponse>('/dashboard/recommendations', limit ? { limit } : undefined),
  
  // Record a search query for recommendations
  recordSearch: (query: string, categoryId?: string, resultsCount?: number) =>
    api.post<{ recorded: boolean }>('/dashboard/search', { query, categoryId, resultsCount }),
  
  // Get user's search history
  getSearchHistory: (limit?: number) =>
    api.get<{ searchHistory: SearchHistoryItem[] }>('/dashboard/search-history', limit ? { limit } : undefined),
  
  // Clear user's search history
  clearSearchHistory: () =>
    api.delete<{ success: boolean }>('/dashboard/search-history'),
  
  // Simulate payment completion for an order
  simulatePayment: (orderId: string, action: 'pay' | 'fail' = 'pay') =>
    api.post<SimulatePaymentResponse>(`/dashboard/orders/${orderId}/simulate-payment`, { action }),
};

// Types for Reviews API
export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  content: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  images?: {
    id: string;
    imageUrl: string;
    altText: string | null;
  }[];
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
}

export interface CanReviewResult {
  canReview: boolean;
  hasPurchased: boolean;
  hasReviewed: boolean;
  isVerifiedPurchase: boolean;
  reason?: string;
}

export interface ReviewsListResponse {
  reviews: Review[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const reviewsApi = {
  // Get reviews for a product
  getProductReviews: (productId: string, options?: { page?: number; limit?: number; sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful' }) =>
    api.get<ReviewsListResponse>(`/products/${productId}/reviews`, options),

  // Get review statistics for a product
  getProductStats: (productId: string) =>
    api.get<ReviewStats>(`/products/${productId}/reviews/stats`),

  // Check if user can review a product
  canReview: (productId: string) =>
    api.get<CanReviewResult>(`/products/${productId}/reviews/can-review`),

  // Create a new review
  create: (data: { productId: string; rating: number; title?: string; content: string }) =>
    api.post<Review>('/reviews', data),

  // Update a review
  update: (reviewId: string, data: { rating?: number; title?: string; content?: string }) =>
    api.put<Review>(`/reviews/${reviewId}`, data),

  // Delete a review
  delete: (reviewId: string) =>
    api.delete<{ success: boolean; message: string }>(`/reviews/${reviewId}`),

  // Mark a review as helpful or not helpful
  markHelpful: (reviewId: string, helpful: boolean) =>
    api.post<Review>(`/reviews/${reviewId}/helpful`, { helpful }),
};

export default api;
