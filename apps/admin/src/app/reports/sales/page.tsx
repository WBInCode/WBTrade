'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Download, 
  DollarSign,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Auth token helper
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

interface SalesReportData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    revenueChange: number;
    ordersChange: number;
    avgOrderChange: number;
    conversionChange: number;
  };
  dailyData: {
    date: string;
    revenue: number;
    orders: number;
    avgOrder: number;
  }[];
  monthlyData: {
    name: string;
    revenue: number;
    orders: number;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  topDays: {
    date: string;
    revenue: number;
    orders: number;
    avgOrder: number;
  }[];
}

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesReportData | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Brak tokenu autoryzacji. Zaloguj się ponownie.');
      }
      
      const response = await fetch(`http://localhost:5000/api/reports/sales?range=${dateRange}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Błąd serwera: ${response.status}`);
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err) {
      console.error('Error fetching sales report:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('pl-PL').format(num);

  const handleExport = () => {
    if (!data) return;
    
    const csvContent = [
      ['Data', 'Przychód', 'Zamówienia', 'Średnia wartość'].join(','),
      ...data.dailyData.map(d => [d.date, d.revenue, d.orders, d.avgOrder].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport-sprzedazy-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={fetchReport}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, dailyData, monthlyData, paymentMethods, topDays } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Raport sprzedaży</h1>
          <p className="text-gray-400">Szczegółowa analiza przychodów i zamówień</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="week">Ostatni tydzień</option>
            <option value="month">Ostatni miesiąc</option>
            <option value="quarter">Ostatni kwartał</option>
            <option value="year">Ostatni rok</option>
          </select>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Eksportuj CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className={`flex items-center text-sm ${summary.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {summary.revenueChange > 0 ? '+' : ''}{summary.revenueChange}%
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{formatPrice(summary.totalRevenue)}</p>
          <p className="text-sm text-gray-400">Całkowity przychód</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <span className={`flex items-center text-sm ${summary.ordersChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.ordersChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {summary.ordersChange > 0 ? '+' : ''}{summary.ordersChange}%
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(summary.totalOrders)}</p>
          <p className="text-sm text-gray-400">Liczba zamówień</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className={`flex items-center text-sm ${summary.avgOrderChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.avgOrderChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {summary.avgOrderChange > 0 ? '+' : ''}{summary.avgOrderChange}%
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{formatPrice(summary.avgOrderValue)}</p>
          <p className="text-sm text-gray-400">Średnia wartość zamówienia</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <span className={`flex items-center text-sm ${summary.conversionChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.conversionChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {summary.conversionChange > 0 ? '+' : ''}{summary.conversionChange}%
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{summary.conversionRate}%</p>
          <p className="text-sm text-gray-400">Współczynnik konwersji</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Przychody w czasie</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b"
                tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis 
                stroke="#64748b"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f8fafc' }}
                formatter={(value: number) => [formatPrice(value), 'Przychód']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#f97316" 
                strokeWidth={2}
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Comparison & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Porównanie miesięczne</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis 
                  stroke="#64748b"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => [formatPrice(value), 'Przychód']}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Metody płatności</h3>
          <div className="space-y-4">
            {paymentMethods.length > 0 ? paymentMethods.map((item) => (
              <div key={item.method}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300">{item.method}</span>
                  <span className="text-white font-medium">{formatPrice(item.amount)}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.percentage}% wszystkich transakcji</p>
              </div>
            )) : (
              <p className="text-gray-400 text-center py-4">Brak danych o płatnościach</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Days Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Najlepsze dni sprzedaży</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Data</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Przychód</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Zamówienia</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Śr. wartość</th>
              </tr>
            </thead>
            <tbody>
              {topDays.length > 0 ? topDays.map((day) => (
                <tr key={day.date} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white">
                    {new Date(day.date).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </td>
                  <td className="py-3 px-4 text-right text-green-400 font-medium">{formatPrice(day.revenue)}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{day.orders}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{formatPrice(day.avgOrder)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">Brak danych sprzedaży w wybranym okresie</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
