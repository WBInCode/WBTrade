const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Generic API helper - returns Response (for backward compatibility)
export const api = {
  get: async (endpoint: string, token?: string): Promise<Response> => {
    return fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },
  
  post: async (endpoint: string, data: any, token?: string): Promise<Response> => {
    return fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
  
  put: async (endpoint: string, data: any, token?: string): Promise<Response> => {
    return fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
  
  patch: async (endpoint: string, data: any, token?: string): Promise<Response> => {
    return fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
  
  delete: async (endpoint: string, token?: string): Promise<Response> => {
    return fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },
};

// JSON API helper - returns parsed JSON with error handling
export const apiJson = {
  get: async <T = any>(endpoint: string, token?: string): Promise<T> => {
    const response = await api.get(endpoint, token);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  },
  
  post: async <T = any>(endpoint: string, data: any, token?: string): Promise<T> => {
    const response = await api.post(endpoint, data, token);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  },
  
  put: async <T = any>(endpoint: string, data: any, token?: string): Promise<T> => {
    const response = await api.put(endpoint, data, token);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  },
  
  patch: async <T = any>(endpoint: string, data: any, token?: string): Promise<T> => {
    const response = await api.patch(endpoint, data, token);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  },
  
  delete: async <T = any>(endpoint: string, token?: string): Promise<T> => {
    const response = await api.delete(endpoint, token);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  },
};

// Typy dla dashboardu
export interface DashboardKPIs {
  ordersToday: number;
  ordersTodayChange: number;
  revenueToday: number;
  revenueTodayChange: number;
  newCustomersToday: number;
  newCustomersTodayChange: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  stockPercentage: number;
  image: string | null;
}

export interface DashboardAlert {
  id: string;
  type: 'order' | 'stock' | 'payment' | 'return';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  link?: string;
  createdAt: string;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  salesChart: SalesChartData[];
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
  alerts: DashboardAlert[];
}

// Pobierz token z localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const tokens = localStorage.getItem('admin_auth_tokens');
  if (!tokens) return null;
  try {
    return JSON.parse(tokens).accessToken;
  } catch {
    return null;
  }
}

// Fetch z autoryzacja
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// API funkcje
export const dashboardApi = {
  // Pobierz wszystkie dane dashboardu naraz
  getSummary: (): Promise<DashboardSummary> => fetchWithAuth('/admin/dashboard'),

  // Pobierz KPI
  getKPIs: (): Promise<DashboardKPIs> => fetchWithAuth('/admin/dashboard/kpis'),

  // Pobierz dane wykresu
  getSalesChart: (days = 30): Promise<SalesChartData[]> => 
    fetchWithAuth(`/admin/dashboard/sales-chart?days=${days}`),

  // Pobierz ostatnie zamowienia
  getRecentOrders: (limit = 10): Promise<RecentOrder[]> => 
    fetchWithAuth(`/admin/dashboard/recent-orders?limit=${limit}`),

  // Pobierz produkty z niskim stanem
  getLowStock: (limit = 10, threshold = 10): Promise<LowStockProduct[]> => 
    fetchWithAuth(`/admin/dashboard/low-stock?limit=${limit}&threshold=${threshold}`),

  // Pobierz alerty
  getAlerts: (): Promise<DashboardAlert[]> => fetchWithAuth('/admin/dashboard/alerts'),
};
