'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  BarChart3, 
  ArrowUpDown,
  Plus,
  Minus,
  ArrowRightLeft,
  MapPin,
  History,
  ClipboardCheck,
  RefreshCw
} from 'lucide-react';

interface InventoryItem {
  id: string;
  variantId: string;
  locationId: string;
  quantity: number;
  reserved: number;
  minimum: number;
  available: number;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    price: number;
  };
  product: {
    id: string;
    name: string;
    image: string | null;
  };
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
}

export default function WarehousePage() {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [sortBy, setSortBy] = useState<'product' | 'sku' | 'quantity' | 'location'>('product');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0
  });

  useEffect(() => {
    loadData();
  }, [token, filter, selectedLocation, page]);

  async function loadData() {
    if (!token) return;
    try {
      setLoading(true);
      
      // Load locations
      const locationsRes = await api.get('/api/locations', token);
      if (locationsRes.ok) {
        const locData = await locationsRes.json();
        setLocations(locData);
      }

      // Load inventory
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        filter: filter
      });
      if (selectedLocation) params.append('locationId', selectedLocation);
      
      const invRes = await api.get(`/api/inventory/all?${params}`, token);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData.data || []);
        setTotalPages(invData.pagination?.pages || 1);
        
        // Calculate stats
        const items = invData.data || [];
        setStats({
          totalItems: invData.pagination?.total || items.length,
          totalStock: items.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0),
          lowStock: items.filter((item: InventoryItem) => 
            item.quantity > 0 && (item.minimum > 0 ? item.quantity <= item.minimum : item.quantity <= 5)
          ).length,
          outOfStock: items.filter((item: InventoryItem) => item.available <= 0).length
        });
      }
    } catch (error) {
      console.error('Failed to load warehouse data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter by search
  const filteredInventory = inventory.filter(item => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.variant.sku.toLowerCase().includes(searchLower) ||
      item.product.name.toLowerCase().includes(searchLower) ||
      (item.variant.name?.toLowerCase().includes(searchLower))
    );
  });

  // Sort
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'product':
        comparison = a.product.name.localeCompare(b.product.name);
        break;
      case 'sku':
        comparison = a.variant.sku.localeCompare(b.variant.sku);
        break;
      case 'quantity':
        comparison = a.quantity - b.quantity;
        break;
      case 'location':
        comparison = a.location.name.localeCompare(b.location.name);
        break;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.available <= 0) return { color: 'bg-red-500/20 text-red-400', label: 'Brak' };
    if (item.minimum > 0 && item.quantity <= item.minimum) return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Niski stan' };
    if (item.quantity <= 5) return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Niski stan' };
    return { color: 'bg-green-500/20 text-green-400', label: 'Dostępny' };
  };

  const quickActions = [
    { href: '/warehouse/receive', icon: Plus, label: 'Przyjęcie (PZ)', color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30' },
    { href: '/warehouse/ship', icon: Minus, label: 'Wydanie (WZ)', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30' },
    { href: '/warehouse/transfer', icon: ArrowRightLeft, label: 'Przesunięcie', color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' },
    { href: '/warehouse/inventory-count', icon: ClipboardCheck, label: 'Inwentaryzacja', color: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' },
  ];

  const navLinks = [
    { href: '/warehouse/movements', icon: History, label: 'Historia ruchów' },
    { href: '/warehouse/locations', icon: MapPin, label: 'Lokalizacje' },
    { href: '/warehouse/alerts', icon: AlertTriangle, label: 'Alerty stanów' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Magazyn (WMS)</h1>
          <p className="text-gray-400">Zarządzaj stanami magazynowymi i operacjami</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pozycje magazynowe</p>
              <p className="text-xl font-bold text-white">{stats.totalItems}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Łączny stan</p>
              <p className="text-xl font-bold text-white">{stats.totalStock.toLocaleString('pl-PL')} szt.</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Niski stan</p>
              <p className="text-xl font-bold text-white">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Brak na stanie</p>
              <p className="text-xl font-bold text-white">{stats.outOfStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po SKU, nazwie produktu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedLocation}
            onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Wszystkie lokalizacje</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
            ))}
          </select>
          
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(['all', 'low', 'out'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {f === 'all' ? 'Wszystkie' : f === 'low' ? 'Niski stan' : 'Brak'}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => loadData()}
            className="p-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
            title="Odśwież"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-800/80">
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-white"
                  onClick={() => toggleSort('product')}
                >
                  <div className="flex items-center gap-1">
                    Produkt / Wariant <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-white"
                  onClick={() => toggleSort('sku')}
                >
                  <div className="flex items-center gap-1">
                    SKU <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-white"
                  onClick={() => toggleSort('location')}
                >
                  <div className="flex items-center gap-1">
                    Lokalizacja <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-white text-right"
                  onClick={() => toggleSort('quantity')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Ilość <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Zarezerwowane</th>
                <th className="px-6 py-4 text-right">Dostępne</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4">
                      <div className="h-12 bg-slate-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : sortedInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Brak pozycji magazynowych</p>
                    <p className="text-sm mt-2">Dodaj towar przez formularz przyjęcia (PZ)</p>
                  </td>
                </tr>
              ) : (
                sortedInventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.product.image ? (
                            <img 
                              src={item.product.image} 
                              alt={item.product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{item.product.name}</p>
                            {item.variant.name && (
                              <p className="text-sm text-gray-400">{item.variant.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-sm">
                        {item.variant.sku}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{item.location.name}</span>
                          <span className="text-xs text-gray-500">({item.location.code})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-white font-medium">{item.quantity}</span>
                        <span className="text-gray-400 text-sm ml-1">szt.</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-orange-400">{item.reserved}</span>
                        <span className="text-gray-400 text-sm ml-1">szt.</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={item.available <= 0 ? 'text-red-400' : 'text-green-400'}>
                          {item.available}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">szt.</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/warehouse/movements?variantId=${item.variantId}`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Historia ruchów"
                          >
                            <History className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
            <p className="text-sm text-gray-400">
              Strona {page} z {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
              >
                Poprzednia
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
