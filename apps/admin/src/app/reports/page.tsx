'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
  Package
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data for reports
const salesData = [
  { name: 'Sty', value: 45000 },
  { name: 'Lut', value: 52000 },
  { name: 'Mar', value: 48000 },
  { name: 'Kwi', value: 61000 },
  { name: 'Maj', value: 55000 },
  { name: 'Cze', value: 67000 },
  { name: 'Lip', value: 72000 },
  { name: 'Sie', value: 69000 },
  { name: 'Wrz', value: 78000 },
  { name: 'Paz', value: 85000 },
  { name: 'Lis', value: 91000 },
  { name: 'Gru', value: 98000 },
];

const categoryData = [
  { name: 'Elektronika', value: 35 },
  { name: 'Odziez', value: 25 },
  { name: 'Dom i ogrod', value: 20 },
  { name: 'Sport', value: 12 },
  { name: 'Inne', value: 8 },
];

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6'];

const ordersData = [
  { name: 'Pon', orders: 45, revenue: 8500 },
  { name: 'Wt', orders: 52, revenue: 9200 },
  { name: 'Sr', orders: 48, revenue: 7800 },
  { name: 'Czw', orders: 61, revenue: 11200 },
  { name: 'Pt', orders: 55, revenue: 10500 },
  { name: 'Sob', orders: 72, revenue: 14200 },
  { name: 'Nd', orders: 38, revenue: 6800 },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState<'sales' | 'orders' | 'products' | 'customers'>('sales');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Raporty</h1>
          <p className="text-gray-400">Analizuj wyniki sprzedazy</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="week">Ostatni tydzien</option>
            <option value="month">Ostatni miesiac</option>
            <option value="quarter">Ostatni kwartal</option>
            <option value="year">Ostatni rok</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            <Download className="w-4 h-4" />
            Eksportuj
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'sales', label: 'Sprzedaz', icon: DollarSign },
          { id: 'orders', label: 'Zamowienia', icon: ShoppingCart },
          { id: 'products', label: 'Produkty', icon: Package },
          { id: 'customers', label: 'Klienci', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as typeof reportType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              reportType === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" /> +12.5%
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-3">Przychod</p>
          <p className="text-2xl font-bold text-white">{formatPrice(821000)}</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" /> +8.2%
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-3">Zamowienia</p>
          <p className="text-2xl font-bold text-white">2,847</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" /> +15.3%
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-3">Nowi klienci</p>
          <p className="text-2xl font-bold text-white">423</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <TrendingDown className="w-4 h-4" /> -2.1%
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-3">Srednia wartosc</p>
          <p className="text-2xl font-bold text-white">{formatPrice(288.42)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h3 className="text-lg font-medium text-white mb-4">Sprzedaz w czasie</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [formatPrice(value), 'Przychod']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: '#f97316', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h3 className="text-lg font-medium text-white mb-4">Sprzedaz wg kategorii</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}%`, 'Udzial']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-gray-400 text-sm">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Chart */}
      <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h3 className="text-lg font-medium text-white mb-4">Zamowienia i przychod (ostatni tydzien)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ordersData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis yAxisId="left" stroke="#94a3b8" />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Zamowienia" />
            <Bar yAxisId="right" dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} name="Przychod" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products Table */}
      <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h3 className="text-lg font-medium text-white mb-4">Najpopularniejsze produkty</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="pb-4">Produkt</th>
              <th className="pb-4">Sprzedane</th>
              <th className="pb-4">Przychod</th>
              <th className="pb-4">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {[
              { name: 'iPhone 15 Pro', sold: 245, revenue: 1225000, trend: 12.5 },
              { name: 'MacBook Air M3', sold: 189, revenue: 945000, trend: 8.2 },
              { name: 'AirPods Pro', sold: 423, revenue: 507600, trend: -3.1 },
              { name: 'iPad Pro 12.9', sold: 156, revenue: 624000, trend: 15.7 },
              { name: 'Apple Watch Ultra', sold: 198, revenue: 396000, trend: 22.3 },
            ].map((product) => (
              <tr key={product.name} className="hover:bg-slate-700/30">
                <td className="py-4 text-white font-medium">{product.name}</td>
                <td className="py-4 text-gray-300">{product.sold} szt.</td>
                <td className="py-4 text-white">{formatPrice(product.revenue)}</td>
                <td className="py-4">
                  <span className={`flex items-center gap-1 ${product.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {product.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(product.trend)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
