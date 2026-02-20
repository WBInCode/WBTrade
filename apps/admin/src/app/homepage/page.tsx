'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  BarChart3,
  Activity,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  dashboardApi,
  DashboardKPIs,
  SalesChartData,
  RecentOrder,
  LowStockProduct,
  DashboardAlert,
} from '@/lib/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ── Status badges ──
const statusLabels: Record<string, string> = {
  PENDING: 'Oczekujące',
  CONFIRMED: 'Opłacone',
  PROCESSING: 'W realizacji',
  SHIPPED: 'Wysłane',
  DELIVERED: 'Dostarczone',
  CANCELLED: 'Anulowane',
  REFUNDED: 'Zwrócone',
  OPEN: 'Otwarte',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-green-500/20 text-green-400',
  PROCESSING: 'bg-blue-500/20 text-blue-400',
  SHIPPED: 'bg-purple-500/20 text-purple-400',
  DELIVERED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-orange-500/20 text-orange-400',
  OPEN: 'bg-slate-500/20 text-slate-400',
};

const severityConfig = {
  error: { icon: AlertCircle, bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400' },
  info: { icon: Info, bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
};

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

// ── Formatters ──
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Teraz';
  if (mins < 60) return `${mins} min temu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h temu`;
  const days = Math.floor(hrs / 24);
  return `${days}d temu`;
}

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.name.includes('Przychód') || entry.name.includes('Anulowane (kwota)')
            ? formatCurrency(entry.value)
            : `${entry.value} zam.`}
        </p>
      ))}
    </div>
  );
}

// ── KPI Card ──
function KPICard({
  title,
  value,
  change,
  icon: Icon,
  prefix = '',
  suffix = '',
  color,
}: {
  title: string;
  value: number;
  change: number;
  icon: any;
  prefix?: string;
  suffix?: string;
  color: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">
            {prefix}
            {typeof value === 'number' && prefix === ''
              ? value.toLocaleString('pl-PL')
              : prefix === ''
                ? value
                : formatCurrency(value).replace('zł', '').trim()}
            {suffix && <span className="text-lg text-slate-400 ml-1">{suffix}</span>}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}
              {change}%
            </span>
            <span className="text-xs text-slate-500">vs wczoraj</span>
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──
export default function HomepagePage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [salesChart, setSalesChart] = useState<SalesChartData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartDays, setChartDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await dashboardApi.getSummary();
      setKpis(data.kpis);
      setSalesChart(data.salesChart);
      setRecentOrders(data.recentOrders);
      setLowStock(data.lowStockProducts);
      setAlerts(data.alerts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadChart = useCallback(async (days: number) => {
    try {
      const chart = await dashboardApi.getSalesChart(days);
      setSalesChart(chart);
      setChartDays(days);
    } catch (error) {
      console.error('Chart load error:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(true), 5 * 60 * 1000); // auto-refresh 5 min
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Aggregate for pie chart
  const ordersByStatus = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    status,
  }));

  // Summary stats from chart (excluding cancelled)
  const totalRevenue = salesChart.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesChart.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalCancelledRevenue = salesChart.reduce((sum, d) => sum + (d.cancelledRevenue || 0), 0);
  const totalCancelledOrders = salesChart.reduce((sum, d) => sum + (d.cancelledOrders || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Ładowanie dashboardu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Przegląd sklepu w czasie rzeczywistym
            {lastUpdated && (
              <span className="ml-2 text-slate-500">
                • Odświeżono {lastUpdated.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => {
            const config = severityConfig[alert.severity];
            const AlertIcon = config.icon;
            return (
              <Link
                key={alert.id}
                href={alert.link || '#'}
                className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg} hover:opacity-90 transition-opacity`}
              >
                <AlertIcon className={`w-4 h-4 ${config.text} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${config.text}`}>{alert.title}</span>
                  <span className="text-xs text-slate-400 ml-2">{alert.description}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Zamówienia dziś"
            value={kpis.ordersToday}
            change={kpis.ordersTodayChange}
            icon={ShoppingCart}
            color="bg-blue-500/10 text-blue-400"
          />
          <KPICard
            title="Przychód dziś"
            value={kpis.revenueToday}
            change={kpis.revenueTodayChange}
            icon={DollarSign}
            prefix="PLN "
            color="bg-green-500/10 text-green-400"
          />
          <KPICard
            title="Nowi klienci"
            value={kpis.newCustomersToday}
            change={kpis.newCustomersTodayChange}
            icon={Users}
            color="bg-purple-500/10 text-purple-400"
          />
          <KPICard
            title="Do realizacji"
            value={kpis.pendingOrders}
            change={0}
            icon={Clock}
            color="bg-orange-500/10 text-orange-400"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold">Sprzedaż</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatCurrency(totalRevenue)} łączny przychód • {totalOrders} zamówień
                {totalCancelledOrders > 0 && (
                  <span className="text-red-400/70"> • {totalCancelledOrders} anulowanych ({formatCurrency(totalCancelledRevenue)})</span>
                )}
              </p>
            </div>
            <div className="flex gap-1 bg-slate-900 rounded-lg p-0.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => loadChart(d)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    chartDays === d
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientCancelled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#gradientRevenue)"
                  name="Przychód"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f97316' }}
                />
                {totalCancelledRevenue > 0 && (
                  <Area
                    type="monotone"
                    dataKey="cancelledRevenue"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    fill="url(#gradientCancelled)"
                    name="Anulowane (kwota)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#ef4444' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status (Pie) */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Zamówienia wg statusu</h2>
          <p className="text-xs text-slate-400 mb-4">Ostatnie {recentOrders.length} zamówień</p>
          {pieData.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {pieData.map((entry, i) => (
                  <div key={entry.status} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-xs text-slate-400 truncate">{entry.name}</span>
                    <span className="text-xs text-white font-medium ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              Brak danych
            </div>
          )}
        </div>
      </div>

      {/* Orders Chart (Bar) */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Dzienna liczba zamówień</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Śr. {(totalOrders / (salesChart.length || 1)).toFixed(1)} zamówień/dzień •
              Śr. wartość {formatCurrency(avgOrderValue)}
              {totalCancelledOrders > 0 && (
                <span className="text-red-400/70"> • {totalCancelledOrders} anulowanych</span>
              )}
            </p>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Zamówienia" maxBarSize={20} stackId="orders" />
              {totalCancelledOrders > 0 && (
                <Bar dataKey="cancelledOrders" fill="#ef4444" radius={[4, 4, 0, 0]} name="Anulowane" maxBarSize={20} stackId="cancelled" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <h2 className="text-white font-semibold">Ostatnie zamówienia</h2>
              <p className="text-xs text-slate-400 mt-0.5">{recentOrders.length} najnowszych</p>
            </div>
            <Link
              href="/orders"
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
            >
              Wszystkie <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50 mt-4">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Brak zamówień</div>
            ) : (
              recentOrders.slice(0, 8).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">#{order.orderNumber}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[order.status] || 'bg-slate-700 text-slate-300'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {order.customerName} • {order.itemsCount} {order.itemsCount === 1 ? 'produkt' : 'produktów'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{formatCurrency(order.total)}</p>
                    <p className="text-[10px] text-slate-500">{timeAgo(order.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <h2 className="text-white font-semibold">Niski stan magazynowy</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {kpis ? `${kpis.lowStockProducts} produktów poniżej progu` : ''}
              </p>
            </div>
            <Link
              href="/warehouse"
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
            >
              Magazyn <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50 mt-4">
            {lowStock.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Wszystkie produkty mają wystarczający stan
              </div>
            ) : (
              lowStock.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Package className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{product.name}</p>
                    <p className="text-xs text-slate-400">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${product.currentStock === 0 ? 'text-red-400' : product.currentStock < 5 ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {product.currentStock} szt.
                    </p>
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${
                          product.currentStock === 0
                            ? 'bg-red-500'
                            : product.currentStock < 5
                              ? 'bg-yellow-500'
                              : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, product.stockPercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">
          Podsumowanie ({chartDays} dni)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-slate-900/50 rounded-lg">
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-slate-400 mt-1">Łączny przychód</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-400">{totalOrders}</p>
            <p className="text-xs text-slate-400 mt-1">Łączna liczba zamówień</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-lg">
            <p className="text-2xl font-bold text-green-400">{formatCurrency(avgOrderValue)}</p>
            <p className="text-xs text-slate-400 mt-1">Średnia wartość zamówienia</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-lg">
            <p className="text-2xl font-bold text-purple-400">
              {(totalOrders / (salesChart.length || 1)).toFixed(1)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Śr. zamówień / dzień</p>
          </div>
          <div className="text-center p-3 bg-slate-900/50 rounded-lg border border-red-500/10">
            <p className="text-2xl font-bold text-red-400">{totalCancelledOrders}</p>
            <p className="text-xs text-slate-400 mt-1">Anulowane ({formatCurrency(totalCancelledRevenue)})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
