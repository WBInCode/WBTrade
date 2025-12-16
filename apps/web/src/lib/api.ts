/**
 * API Client for WBTrade Web Application
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    return localStorage.getItem('auth_token');
  }
  return null;
}

// Base fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  config: RequestConfig = {}
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
      throw new ApiClientError(
        data.message || 'An error occurred',
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
  sku?: string;
  barcode?: string;
  status: 'active' | 'draft' | 'archived';
  images?: ProductImage[];
  variants?: ProductVariant[];
  category?: Category;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Extended fields for UI
  badge?: 'super-price' | 'outlet' | 'bestseller' | 'new';
  rating?: string | number;
  reviewCount?: number;
  storeName?: string;
  hasSmart?: boolean;
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
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
  status?: 'active' | 'draft' | 'archived';
}

export const productsApi = {
  getAll: (filters?: ProductFilters) =>
    api.get<ProductsListResponse>('/products', filters as Record<string, string | number | boolean>),
    
  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),
    
  getBySlug: (slug: string) =>
    api.get<Product>(`/products/slug/${slug}`),
    
  create: (product: Partial<Product>) =>
    api.post<Product>('/products', product),
    
  update: (id: string, product: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, product),
    
  delete: (id: string) =>
    api.delete<void>(`/products/${id}`),
};

// ============================================
// CATEGORIES API
// ============================================

export interface CategoriesListResponse {
  categories: Category[];
}

export const categoriesApi = {
  getAll: () =>
    api.get<CategoriesListResponse>('/categories'),
    
  getById: (id: string) =>
    api.get<Category>(`/categories/${id}`),
    
  getBySlug: (slug: string) =>
    api.get<Category>(`/categories/slug/${slug}`),
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

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: CartItem[];
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  shippingMethod: string;
  paymentMethod: string;
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
    api.post<Order>(`/orders/${id}/cancel`),
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
    
  getProfile: () =>
    api.get<User>('/auth/profile'),
    
  updateProfile: (data: Partial<User>) =>
    api.patch<User>('/auth/profile', data),
};

// ============================================
// USER ADDRESSES API
// ============================================

export interface Address {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export const addressesApi = {
  getAll: () =>
    api.get<Address[]>('/addresses'),
    
  create: (address: Omit<Address, 'id' | 'userId'>) =>
    api.post<Address>('/addresses', address),
    
  update: (id: string, address: Partial<Address>) =>
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

export default api;
