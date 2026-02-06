'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingCart, Search, Filter, Eye, ChevronLeft, ChevronRight, 
  Truck, FileText, Package, Calendar, RefreshCw, Download,
  MoreVertical, X, Ban, RotateCcw, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
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

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: { 
    id: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PROCESSING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SHIPPED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  DELIVERED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  REFUNDED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels: Record<string, string> = {
  OPEN: 'Otwarte',
  PENDING: 'Oczekujące',
  CONFIRMED: 'Opłacone',
  PROCESSING: 'W realizacji',
  SHIPPED: 'Wysłane',
  DELIVERED: 'Dostarczone',
  CANCELLED: 'Anulowane',
  REFUNDED: 'Zwrócone',
};

const paymentMethods: Record<string, string> = {
  CARD: 'Karta',
  BLIK: 'BLIK',
  TRANSFER: 'Przelew',
  CASH: 'Gotówka',
};

const shippingMethods: Record<string, string> = {
  INPOST: 'InPost Paczkomat',
  COURIER: 'Kurier',
  PICKUP: 'Odbiór osobisty',
};

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') || '';
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [pendingCancellationsCount, setPendingCancellationsCount] = useState(0);

  // Load pending cancellations count
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/orders/admin/pending-cancellations`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        const data = await response.json();
        setPendingCancellationsCount(Array.isArray(data) ? data.length : 0);
      } catch (error) {
        console.error('Failed to load pending cancellations count:', error);
      }
    };
    loadPendingCount();
  }, []);

  // Sync statusFilter with URL parameter
  useEffect(() => {
    setStatusFilter(urlStatus);
    setPage(1);
  }, [urlStatus]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      
      const response = await fetch(`${API_URL}/orders/admin/all?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pl-PL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Czy na pewno chcesz anulować to zamówienie?')) return;
    
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      loadOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
    setActionMenuId(null);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Pending Cancellations Alert */}
      {pendingCancellationsCount > 0 && (
        <Link
          href="/orders/pending-cancellations"
          className="block bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 hover:bg-yellow-500/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-yellow-400 font-medium">
                  {pendingCancellationsCount} zamówień firmowych (FV00) czeka na zatwierdzenie anulowania
                </p>
                <p className="text-gray-400 text-sm">
                  Kliknij aby przejść do panelu zatwierdzania
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-yellow-500 text-black font-bold text-sm">
              {pendingCancellationsCount}
            </span>
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Zamówienia</h1>
          <p className="text-gray-400">Zarządzaj zamówieniami klientów • {total} zamówień</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Odśwież
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Eksportuj
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(statusLabels).map(([status, label]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            className={`p-3 rounded-xl border transition-all ${
              statusFilter === status 
                ? `${statusColors[status]} border-2`
                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
            }`}
          >
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-lg font-bold text-white">{statusCounts[status] || 0}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Szukaj po numerze, kliencie, emailu..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Wszystkie statusy</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              showFilters ? 'bg-orange-500 text-white' : 'bg-slate-900 border border-slate-700 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtry
          </button>

          {(statusFilter || searchTerm || dateFrom || dateTo) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Wyczyść
            </button>
          )}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data od</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data do</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
          <p className="text-orange-400">
            Zaznaczono {selectedOrders.length} zamówień
          </p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors">
              Zmień status
            </button>
            <button className="px-4 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors">
              Drukuj etykiety
            </button>
            <button 
              onClick={() => setSelectedOrders([])}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-800/80">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
                  />
                </th>
                <th className="px-4 py-4">Zamówienie</th>
                <th className="px-4 py-4">Klient</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Produkty</th>
                <th className="px-4 py-4">Dostawa</th>
                <th className="px-4 py-4">Płatność</th>
                <th className="px-4 py-4 text-right">Kwota</th>
                <th className="px-4 py-4">Data</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-14 bg-slate-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-400">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Brak zamówień</p>
                    <p className="text-sm">Nie znaleziono zamówień spełniających kryteria</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/orders/${order.id}`} className="hover:text-orange-400 transition-colors">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{order.orderNumber}</p>
                          {order.orderNumber.includes('-FV00') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              FV
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">#{order.id.slice(0, 8)}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {order.user ? (
                        <div>
                          <p className="text-white">{order.user.firstName} {order.user.lastName}</p>
                          <p className="text-xs text-gray-400">{order.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500">Gość</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[order.status]}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300">
                          {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} szt.
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-300 text-sm">
                        {shippingMethods[order.shippingMethod] || order.shippingMethod}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-300 text-sm">
                        {paymentMethods[order.paymentMethod] || order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-white font-medium">{formatPrice(order.total)}</p>
                      <p className="text-xs text-gray-500">netto: {formatPrice(order.subtotal)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === order.id ? null : order.id)}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {actionMenuId === order.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                          <Link
                            href={`/orders/${order.id}`}
                            className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Szczegóły
                          </Link>
                          <Link
                            href={`/orders/${order.id}/label`}
                            className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <Truck className="w-4 h-4" />
                            Etykieta kurierska
                          </Link>
                          <Link
                            href={`/orders/${order.id}/invoice`}
                            className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            Faktura
                          </Link>
                          <div className="border-t border-slate-700 my-1"></div>
                          {order.status === 'CANCELLED' || order.status === 'REFUNDED' ? (
                            <button
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Przywróć
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                              Anuluj
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          Wyświetlanie {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} z {total} zamówień
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 border border-slate-700 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Click outside to close menu */}
      {actionMenuId && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setActionMenuId(null)}
        />
      )}
    </div>
  );
}
