'use client';

import { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Edit, Trash2, Eye, 
  ChevronLeft, ChevronRight, ArrowUpDown, Download, Upload,
  CheckSquare, Square, Archive, Check, X
} from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  compareAtPrice: number | null;
  status: string;
  categoryId: string;
  category?: { name: string };
  images: { url: string }[];
  variants: { id: string; sku: string; price: number }[];
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, search, statusFilter, categoryFilter, sortBy, sortDir]);

  async function loadProducts() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        sortBy,
        sortDir,
      });
      
      const response = await fetch(`http://localhost:5000/api/products?${params}`);
      const data = await response.json();
      
      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalProducts(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch('http://localhost:5000/api/categories');
      const data = await response.json();
      const cats = Array.isArray(data) ? data : (data.categories || []);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400',
    DRAFT: 'bg-yellow-500/20 text-yellow-400',
    ARCHIVED: 'bg-gray-500/20 text-gray-400',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Aktywny',
    DRAFT: 'Szkic',
    ARCHIVED: 'Zarchiwizowany',
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  // Bulk actions
  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`http://localhost:5000/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          })
        )
      );
      setSelectedIds(new Set());
      loadProducts();
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Czy na pewno chcesz usunac ${selectedIds.size} produktow?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`http://localhost:5000/api/products/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds(new Set());
      loadProducts();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Nazwa', 'SKU', 'Cena', 'Stan', 'Status', 'Kategoria'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.sku,
      p.price,
      p.stock || 0,
      p.status,
      p.category?.name || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produkty_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Sorting
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Produkty</h1>
          <p className="text-gray-400">{totalProducts} produktow w bazie</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/products/import"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Eksport
          </button>
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Dodaj produkt
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po nazwie, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Wszystkie statusy</option>
          <option value="ACTIVE">Aktywne</option>
          <option value="DRAFT">Szkice</option>
          <option value="ARCHIVED">Zarchiwizowane</option>
        </select>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <span className="text-orange-400 font-medium">
            Zaznaczono {selectedIds.size} produktow
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => bulkUpdateStatus('ACTIVE')}
              className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
            >
              <Check className="w-4 h-4 inline mr-1" />
              Aktywuj
            </button>
            <button
              onClick={() => bulkUpdateStatus('ARCHIVED')}
              className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-lg text-sm hover:bg-gray-500/30 transition-colors"
            >
              <Archive className="w-4 h-4 inline mr-1" />
              Archiwizuj
            </button>
            <button
              onClick={bulkDelete}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Usun
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-slate-700 text-gray-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4 inline mr-1" />
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-800/80">
              <th className="px-4 py-4">
                <button onClick={selectAll} className="hover:text-white">
                  {selectedIds.size === products.length && products.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-orange-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">
                  Produkt <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort('sku')}>
                <div className="flex items-center gap-1">
                  SKU <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort('price')}>
                <div className="flex items-center gap-1">
                  Cena <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => toggleSort('stock')}>
                <div className="flex items-center gap-1">
                  Stan <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Kategoria</th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-4 py-4">
                    <div className="h-12 bg-slate-700 rounded animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Brak produktow</p>
                  <Link href="/products/new" className="text-orange-400 hover:text-orange-300 mt-2 inline-block">
                    Dodaj pierwszy produkt
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-4">
                    <button onClick={() => toggleSelect(product.id)}>
                      {selectedIds.has(product.id) ? (
                        <CheckSquare className="w-5 h-5 text-orange-400" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 m-3 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{product.name}</p>
                        <p className="text-sm text-gray-400">{product.variants?.length || 0} wariantow</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-300 font-mono text-sm">{product.sku}</td>
                  <td className="px-4 py-4">
                    <p className="text-white font-medium">{formatPrice(product.price)}</p>
                    {product.compareAtPrice && (
                      <p className="text-sm text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-medium ${(product.stock || 0) <= 5 ? 'text-red-400' : 'text-gray-300'}`}>
                      {product.stock || 0} szt.
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {statusLabels[product.status] || product.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-sm">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/products/${product.id}`} className="p-2 hover:bg-slate-600 rounded-lg transition-colors" title="Podglad">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link href={`/products/${product.id}/edit`} className="p-2 hover:bg-slate-600 rounded-lg transition-colors" title="Edytuj">
                        <Edit className="w-4 h-4 text-gray-400" />
                      </Link>
                      <button 
                        onClick={() => {
                          if (confirm('Czy na pewno chcesz usunac ten produkt?')) {
                            fetch(`http://localhost:5000/api/products/${product.id}`, { method: 'DELETE' })
                              .then(() => loadProducts());
                          }
                        }}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors" 
                        title="Usun"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          Strona {page} z {totalPages} ({totalProducts} produktow)
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
