'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { dashboardApi, DashboardSummary } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Status colors
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-purple-500/20 text-purple-400',
  SHIPPED: 'bg-cyan-500/20 text-cyan-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-gray-500/20 text-gray-400',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Oczekujace',
  CONFIRMED: 'Potwierdzone',
  PROCESSING: 'W realizacji',
  SHIPPED: 'Wyslane',
  DELIVERED: 'Dostarczone',
  CANCELLED: 'Anulowane',
  REFUNDED: 'Zwrocone',
};

const alertIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const alertColors = {
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      setError(null);
      const summary = await dashboardApi.getSummary();
      setData(summary);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Nie udalo sie pobrac danych. Upewnij sie, ze API dziala.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // Czekaj aż auth się załaduje i user będzie zalogowany
    if (authLoading || !user) return;
    
    loadData();
    
    // Auto-refresh co 60 sekund
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [authLoading, user]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Ladowanie dashboardu...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Blad ladowania</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Sprobuj ponownie
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, salesChart, recentOrders, lowStockProducts, alerts } = data;

  // Format currency
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

  // Format date for chart
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'przed chwila';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h temu`;
    return `${Math.floor(diffMins / 1440)} dni temu`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Przeglad sklepu i magazynu</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Odswiez
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Orders Today */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
            <span className={`flex items-center text-sm ${kpis.ordersTodayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {kpis.ordersTodayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(kpis.ordersTodayChange)}%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white">{kpis.ordersToday}</h3>
          <p className="text-gray-400 text-sm mt-1">Zamowien dzis</p>
        </div>

        {/* Revenue Today */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <span className={`flex items-center text-sm ${kpis.revenueTodayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {kpis.revenueTodayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(kpis.revenueTodayChange)}%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white">{formatCurrency(kpis.revenueToday)}</h3>
          <p className="text-gray-400 text-sm mt-1">Przychod dzis</p>
        </div>

        {/* New Customers */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <span className={`flex items-center text-sm ${kpis.newCustomersTodayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {kpis.newCustomersTodayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(kpis.newCustomersTodayChange)}%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white">{kpis.newCustomersToday}</h3>
          <p className="text-gray-400 text-sm mt-1">Nowi klienci</p>
        </div>

        {/* Pending Orders */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
            {kpis.lowStockProducts > 0 && (
              <span className="flex items-center text-sm text-orange-400">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {kpis.lowStockProducts} low
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-white">{kpis.pendingOrders}</h3>
          <p className="text-gray-400 text-sm mt-1">Do realizacji</p>
        </div>
      </div>

      {/* Charts & Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Sprzedaz (ostatnie 30 dni)</h2>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                Przychod
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Zamowienia
              </span>
            </div>
          </div>
          
          {salesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatChartDate}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Przychod' : 'Zamowienia'
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              Brak danych sprzedazy
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">Alerty</h2>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.slice(0, 5).map((alert) => {
                const IconComponent = alertIcons[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${alertColors[alert.severity]}`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs opacity-80 mt-1">{alert.description}</p>
                        {alert.link && (
                          <Link
                            href={alert.link}
                            className="text-xs underline hover:no-underline mt-2 inline-block"
                          >
                            Zobacz szczegoly
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Brak alertow</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Ostatnie zamowienia</h2>
            <Link
              href="/orders"
              className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1"
            >
              Zobacz wszystkie <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Zamowienie</th>
                  <th className="px-6 py-3">Klient</th>
                  <th className="px-6 py-3">Kwota</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {recentOrders.length > 0 ? (
                  recentOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{order.orderNumber}</p>
                        <p className="text-xs text-gray-400">{formatTimeAgo(order.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.itemsCount} szt.</p>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/orders/${order.id}`}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors inline-flex"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Brak zamowien
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Niski stan magazynowy</h2>
            <Link
              href="/warehouse?filter=low-stock"
              className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1"
            >
              Zobacz wszystkie <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${product.currentStock <= 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {product.currentStock} szt.
                    </p>
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${product.stockPercentage <= 30 ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${product.stockPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Wszystkie produkty maja odpowiedni stan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
