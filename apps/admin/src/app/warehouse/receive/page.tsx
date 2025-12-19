'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Package, 
  Search,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Variant {
  id: string;
  sku: string;
  name: string | null;
  price: number;
  product: {
    id: string;
    name: string;
    image: string | null;
  };
  totalStock: number;
}

interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface ReceiveItem {
  id: string;
  variantId: string;
  variant: Variant | null;
  quantity: number;
}

export default function ReceivePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiveItem[]>([]);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;
    try {
      setLoading(true);
      
      // Load locations
      const locRes = await api.get('/api/locations', token);
      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(locData.filter((l: Location) => l.type === 'BIN' || l.type === 'SHELF' || l.type === 'WAREHOUSE'));
        if (locData.length > 0) {
          setSelectedLocation(locData[0].id);
        }
      }

      // Load variants
      const varRes = await api.get('/api/inventory/variants', token);
      if (varRes.ok) {
        const varData = await varRes.json();
        setVariants(varData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredVariants = variants.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.sku.toLowerCase().includes(query) ||
      v.product.name.toLowerCase().includes(query) ||
      v.name?.toLowerCase().includes(query)
    );
  });

  const addItem = (variant: Variant) => {
    // Check if already added
    if (items.some(i => i.variantId === variant.id)) {
      return;
    }
    
    setItems([...items, {
      id: crypto.randomUUID(),
      variantId: variant.id,
      variant,
      quantity: 1
    }]);
    setShowSearch(false);
    setSearchQuery('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems(items.map(i => 
      i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
    ));
  };

  const handleSubmit = async () => {
    if (!token || items.length === 0 || !selectedLocation) {
      setError('Wybierz lokalizację i dodaj co najmniej jeden produkt');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Process each item
      for (const item of items) {
        const res = await api.post('/api/inventory/receive', {
          variantId: item.variantId,
          quantity: item.quantity,
          toLocationId: selectedLocation,
          reference,
          notes
        }, token);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Błąd przyjęcia towaru');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/warehouse');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Wystąpił błąd');
    } finally {
      setSaving(false);
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Towar przyjęty!</h2>
          <p className="text-gray-400">Przyjęto {items.length} pozycji ({totalItems} szt.)</p>
          <p className="text-gray-500 text-sm mt-4">Przekierowywanie...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white">Przyjęcie towaru (PZ)</h1>
          <p className="text-gray-400">Dodaj towar do magazynu</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Info */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Informacje o dokumencie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Lokalizacja docelowa *
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Wybierz lokalizację</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code}) - {loc.type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Numer referencyjny
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="np. PZ/2024/001 lub numer WZ dostawcy"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Uwagi
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dodatkowe informacje o dostawie..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Pozycje ({items.length})</h3>
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj produkt
              </button>
            </div>

            {/* Search Modal */}
            {showSearch && (
              <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj po SKU lub nazwie..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredVariants.slice(0, 10).map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => addItem(variant)}
                      disabled={items.some(i => i.variantId === variant.id)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      {variant.product.image ? (
                        <img
                          src={variant.product.image}
                          alt={variant.product.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-600 rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{variant.product.name}</p>
                        <p className="text-sm text-gray-400">
                          {variant.sku} {variant.name && `• ${variant.name}`}
                        </p>
                      </div>
                      <div className="text-sm text-gray-400">
                        Stan: {variant.totalStock}
                      </div>
                    </button>
                  ))}
                  {filteredVariants.length === 0 && (
                    <p className="text-center text-gray-400 py-4">Brak wyników</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="mt-4 w-full px-4 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak pozycji</p>
                <p className="text-sm mt-2">Kliknij "Dodaj produkt" aby rozpocząć</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg"
                  >
                    <span className="text-gray-500 font-mono text-sm w-6">{index + 1}.</span>
                    {item.variant?.product.image ? (
                      <img
                        src={item.variant.product.image}
                        alt={item.variant.product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-600 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {item.variant?.product.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {item.variant?.sku} {item.variant?.name && `• ${item.variant.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-600 text-white rounded hover:bg-slate-500"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-600 text-white rounded hover:bg-slate-500"
                      >
                        +
                      </button>
                      <span className="text-gray-400 text-sm w-8">szt.</span>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 sticky top-6">
            <h3 className="text-lg font-medium text-white mb-4">Podsumowanie</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-400">
                <span>Pozycje:</span>
                <span className="text-white">{items.length}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Łączna ilość:</span>
                <span className="text-white font-medium">{totalItems} szt.</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Lokalizacja:</span>
                <span className="text-white text-sm">
                  {locations.find(l => l.id === selectedLocation)?.name || '-'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || items.length === 0 || !selectedLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Przyjmij towar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
