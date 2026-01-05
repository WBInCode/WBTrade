'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Download,
  TrendingUp,
  MapPin,
  RefreshCw,
  Star
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
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

interface CustomersReportData {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningRate: number;
    avgLifetimeValue: number;
    customersChange: number;
    newCustomersChange: number;
  };
  customerGrowth: {
    date: string;
    newCustomers: number;
    returning: number;
  }[];
  customerSegments: {
    name: string;
    value: number;
    color: string;
  }[];
  topCustomers: {
    id: string;
    name: string;
    email: string;
    orders: number;
    totalSpent: number;
    lastOrder: string;
    city: string;
  }[];
  cityDistribution: {
    city: string;
    customers: number;
    percentage: number;
  }[];
}

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#eab308'];

export default function CustomersReportPage() {
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomersReportData | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Brak tokenu autoryzacji. Zaloguj się ponownie.');
      }
      
      const response = await fetch(`http://localhost:5000/api/reports/customers?range=${dateRange}`, {
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
      console.error('Error fetching customers report:', err);
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
      ['Klient', 'Email', 'Zamówienia', 'Łączna wartość', 'Ostatnie zamówienie', 'Miasto'].join(','),
      ...data.topCustomers.map(c => [
        `"${c.name}"`,
        c.email,
        c.orders,
        c.totalSpent,
        c.lastOrder,
        `"${c.city || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport-klientow-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
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

  const { summary, customerGrowth, customerSegments, topCustomers, cityDistribution } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Raport klientów</h1>
          <p className="text-gray-400">Analiza bazy klientów i ich zachowań</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(summary.totalCustomers)}</p>
          <p className="text-sm text-gray-400">Wszyscy klienci</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(summary.newCustomers || 0)}</p>
          <p className="text-sm text-gray-400">Nowi klienci</p>
          <p className="text-xs text-green-400 mt-1">{summary.newCustomersChange > 0 ? '+' : ''}{summary.newCustomersChange || 0}% wzrost</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{(summary.returningRate || 0).toFixed(1)}%</p>
          <p className="text-sm text-gray-400">Powracający klienci</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatPrice(summary.avgLifetimeValue || 0)}</p>
          <p className="text-sm text-gray-400">Śr. wartość klienta (LTV)</p>
        </div>
      </div>

      {/* Customer Growth Chart */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Wzrost bazy klientów</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={customerGrowth}>
              <defs>
                <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b"
                tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f8fafc' }}
                formatter={(value: number, name: string) => [
                  formatNumber(value), 
                  name === 'returning' ? 'Powracający' : 'Nowi'
                ]}
                labelFormatter={(label) => new Date(label).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
              />
              <Area 
                type="monotone" 
                dataKey="returning" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="url(#colorCustomers)" 
                name="returning"
              />
              <Area 
                type="monotone" 
                dataKey="newCustomers" 
                stroke="#22c55e" 
                strokeWidth={2}
                fill="url(#colorNew)" 
                name="newCustomers"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Segments & City Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segments */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Segmenty klientów</h3>
          {customerSegments.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#64748b' }}
                  >
                    {customerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value} klientów`, 'Ilość']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Brak danych o segmentach
            </div>
          )}
        </div>

        {/* City Distribution */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-400" />
            Rozkład geograficzny
          </h3>
          <div className="space-y-3 max-h-[256px] overflow-y-auto">
            {cityDistribution.length > 0 ? cityDistribution.map((item) => (
              <div key={item.city}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300">{item.city}</span>
                  <span className="text-white font-medium">{item.customers} klientów</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-center py-8">Brak danych o lokalizacji klientów</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Najlepsi klienci</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Klient</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Zamówienia</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Łączna wartość</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Miasto</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Ostatnie zamówienie</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.length > 0 ? topCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300">{customer.orders}</td>
                  <td className="py-3 px-4 text-right text-green-400 font-medium">{formatPrice(customer.totalSpent || 0)}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{customer.city || '-'}</td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {new Date(customer.lastOrder).toLocaleDateString('pl-PL')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">Brak danych o klientach</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
