'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  History,
  Package, 
  Search,
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  RefreshCw,
  Calendar,
  MapPin,
  Filter
} from 'lucide-react';

interface Movement {
  id: string;
  variantId: string;
  type: 'RECEIVE' | 'SHIP' | 'TRANSFER' | 'ADJUST' | 'RESERVE' | 'RELEASE';
  quantity: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    product: {
      id: string;
      name: string;
      images: string[];
    };
  };
  fromLocation: { id: string; name: string; code: string } | null;
  toLocation: { id: string; name: string; code: string } | null;
}

interface Variant {
  id: string;
  sku: string;
  name: string | null;
  product: {
    id: string;
    name: string;
  };
}

const movementTypeLabels: Record<string, { label: string; color: string; icon: typeof ArrowDown }> = {
  RECEIVE: { label: 'Przyjęcie (PZ)', color: 'text-green-400 bg-green-500/20', icon: ArrowDown },
  SHIP: { label: 'Wydanie (WZ)', color: 'text-red-400 bg-red-500/20', icon: ArrowUp },
  TRANSFER: { label: 'Przesunięcie', color: 'text-blue-400 bg-blue-500/20', icon: ArrowRightLeft },
  ADJUST: { label: 'Korekta', color: 'text-purple-400 bg-purple-500/20', icon: RefreshCw },
  RESERVE: { label: 'Rezerwacja', color: 'text-orange-400 bg-orange-500/20', icon: Package },
  RELEASE: { label: 'Zwolnienie rez.', color: 'text-yellow-400 bg-yellow-500/20', icon: Package },
};

export default function MovementsPage() {
  const searchParams = useSearchParams();
  const initialVariantId = searchParams.get('variantId') || '';
  
  const { token } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [selectedVariant, setSelectedVariant] = useState(initialVariantId);
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVariants();
  }, [token]);

  useEffect(() => {
    if (selectedVariant) {
      loadMovements();
    }
  }, [selectedVariant, filterType, page]);

  async function loadVariants() {
    if (!token) return;
    try {
      const res = await api.get('/api/inventory/variants', token);
      if (res.ok) {
        const data = await res.json();
        setVariants(data);
      }
    } catch (error) {
      console.error('Failed to load variants:', error);
    } finally {
      if (!initialVariantId) {
        setLoading(false);
      }
    }
  }

  async function loadMovements() {
    if (!token || !selectedVariant) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (filterType) params.append('type', filterType);

      const res = await api.get(`/api/inventory/${selectedVariant}/movements?${params}`, token);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredVariants = variants.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.sku.toLowerCase().includes(query) ||
      v.product.name.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/warehouse"
          className="p-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Historia ruchów magazynowych</h1>
          <p className="text-gray-400">Przeglądaj wszystkie operacje magazynowe</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Variant Search */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Produkt / Wariant
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po SKU lub nazwie..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {searchQuery && (
              <div className="absolute z-10 mt-1 w-full max-w-sm bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredVariants.slice(0, 10).map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariant(v.id);
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-600 transition-colors"
                  >
                    <p className="text-white">{v.product.name}</p>
                    <p className="text-sm text-gray-400">{v.sku}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variant Select */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Wybrany wariant
            </label>
            <select
              value={selectedVariant}
              onChange={(e) => { setSelectedVariant(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Wybierz produkt</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.product.name} ({v.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Typ operacji
            </label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Wszystkie</option>
              <option value="RECEIVE">Przyjęcie (PZ)</option>
              <option value="SHIP">Wydanie (WZ)</option>
              <option value="TRANSFER">Przesunięcie</option>
              <option value="ADJUST">Korekta</option>
              <option value="RESERVE">Rezerwacja</option>
              <option value="RELEASE">Zwolnienie rezerwacji</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {!selectedVariant ? (
          <div className="text-center py-16 text-gray-400">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Wybierz produkt, aby zobaczyć historię ruchów</p>
          </div>
        ) : loading ? (
          <div className="divide-y divide-slate-700/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-16 bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Brak historii ruchów dla tego produktu</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-700/50">
              {movements.map((movement) => {
                const typeInfo = movementTypeLabels[movement.type] || {
                  label: movement.type,
                  color: 'text-gray-400 bg-gray-500/20',
                  icon: Package
                };
                const TypeIcon = typeInfo.icon;

                return (
                  <div key={movement.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`font-mono font-medium ${
                                movement.quantity > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {movement.quantity > 0 ? '+' : ''}{movement.quantity} szt.
                              </span>
                            </div>
                            <p className="text-white font-medium">
                              {movement.variant.product.name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {movement.variant.sku} {movement.variant.name && `• ${movement.variant.name}`}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Calendar className="w-4 h-4" />
                              {formatDate(movement.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Location info */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                          {movement.fromLocation && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <MapPin className="w-4 h-4" />
                              Z: {movement.fromLocation.name} ({movement.fromLocation.code})
                            </span>
                          )}
                          {movement.toLocation && (
                            <span className="flex items-center gap-1 text-green-400">
                              <MapPin className="w-4 h-4" />
                              Do: {movement.toLocation.name} ({movement.toLocation.code})
                            </span>
                          )}
                        </div>

                        {/* Reference & Notes */}
                        {(movement.reference || movement.notes) && (
                          <div className="mt-2 text-sm text-gray-400">
                            {movement.reference && (
                              <span className="mr-4">Ref: {movement.reference}</span>
                            )}
                            {movement.notes && (
                              <span className="italic">{movement.notes}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
          </>
        )}
      </div>
    </div>
  );
}
