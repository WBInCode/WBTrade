'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Download,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

interface ProductsReportData {
  summary: {
    totalProducts: number;
    totalSold: number;
    avgConversion: number;
    lowStockCount: number;
  };
  categoryDistribution: {
    name: string;
    value: number;
    revenue: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
    stock: number;
    trend: number;
  }[];
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#6366f1'];

export default function ProductsReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductsReportData | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Brak tokenu autoryzacji. Zaloguj się ponownie.');
      }
      
      const response = await fetch('http://localhost:5000/api/reports/products', {
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
      console.error('Error fetching products report:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  }, []);

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
      ['Produkt', 'SKU', 'Sprzedane', 'Przychód', 'Magazyn', 'Trend'].join(','),
      ...data.topProducts.map(p => [
        `"${p.name}"`,
        `"${p.sku}"`,
        p.sold,
        p.revenue,
        p.stock,
        `${p.trend}%`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport-produktow-${new Date().toISOString().split('T')[0]}.csv`;
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

  const { summary, categoryDistribution, topProducts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Raport produktów</h1>
          <p className="text-gray-400">Analiza asortymentu i magazynu</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Eksportuj CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(summary.totalProducts || 0)}</p>
          <p className="text-sm text-gray-400">Wszystkie produkty</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(summary.totalSold || 0)}</p>
          <p className="text-sm text-gray-400">Sprzedanych sztuk</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{(summary.avgConversion || 0).toFixed(1)}%</p>
          <p className="text-sm text-gray-400">Konwersja</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(summary.lowStockCount || 0)}</p>
          <p className="text-sm text-gray-400">Niski stan magazynowy</p>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Rozkład kategorii</h3>
          {categoryDistribution.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#64748b' }}
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value}%`, 'Udział']}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    formatter={(value) => <span className="text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              Brak danych o kategoriach
            </div>
          )}        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Najlepiej sprzedające się produkty</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Produkt</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Sprzedane</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Przychód</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Magazyn</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length > 0 ? topProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4">
                    <span className="text-white font-medium">{product.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{product.sku}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{formatNumber(product.sold)}</td>
                  <td className="py-3 px-4 text-right text-green-400">{formatPrice(product.revenue)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={product.stock < 10 ? 'text-red-400' : 'text-gray-300'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`flex items-center justify-end gap-1 ${product.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {product.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {product.trend > 0 ? '+' : ''}{product.trend}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">Brak danych o sprzedaży produktów</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
