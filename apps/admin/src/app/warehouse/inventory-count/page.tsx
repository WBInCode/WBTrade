'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  ClipboardCheck,
  Package, 
  Search,
  Save,
  CheckCircle,
  AlertCircle,
  MapPin,
  Plus,
  Minus,
  AlertTriangle
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

interface CountItem extends InventoryItem {
  countedQuantity: number | null;
  difference: number;
}

export default function InventoryCountPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  useEffect(() => {
    loadLocations();
  }, [token]);

  useEffect(() => {
    if (selectedLocation) {
      loadInventoryForLocation();
    }
  }, [selectedLocation]);

  async function loadLocations() {
    if (!token) return;
    try {
      const res = await api.get('/api/locations', token);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInventoryForLocation() {
    if (!token || !selectedLocation) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/inventory/all?locationId=${selectedLocation}&limit=500`, token);
      if (res.ok) {
        const data = await res.json();
        const items = (data.data || []).map((item: InventoryItem) => ({
          ...item,
          countedQuantity: null,
          difference: 0
        }));
        setCountItems(items);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  const updateCountedQuantity = (itemId: string, value: number | null) => {
    setCountItems(items => items.map(item => {
      if (item.id !== itemId) return item;
      const counted = value;
      const difference = counted !== null ? counted - item.quantity : 0;
      return { ...item, countedQuantity: counted, difference };
    }));
  };

  const filteredItems = countItems.filter(item => {
    if (showOnlyDifferences && item.difference === 0) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.variant.sku.toLowerCase().includes(query) ||
      item.product.name.toLowerCase().includes(query)
    );
  });

  const itemsWithDifferences = countItems.filter(i => i.countedQuantity !== null && i.difference !== 0);
  const totalPositive = itemsWithDifferences.filter(i => i.difference > 0).reduce((sum, i) => sum + i.difference, 0);
  const totalNegative = itemsWithDifferences.filter(i => i.difference < 0).reduce((sum, i) => sum + Math.abs(i.difference), 0);

  const handleSubmit = async () => {
    if (!token || itemsWithDifferences.length === 0) {
      setError('Brak różnic do zapisania');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      for (const item of itemsWithDifferences) {
        const res = await api.post('/api/inventory/adjust', {
          variantId: item.variantId,
          locationId: item.locationId,
          newQuantity: item.countedQuantity,
          reference: reference || 'Inwentaryzacja',
          notes: notes || `Korekta inwentaryzacyjna. Było: ${item.quantity}, Jest: ${item.countedQuantity}`
        }, token);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Błąd korekty stanu');
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

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Inwentaryzacja zakończona!</h2>
          <p className="text-gray-400">
            Skorygowano {itemsWithDifferences.length} pozycji
          </p>
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
          <h1 className="text-2xl font-bold text-white">Inwentaryzacja</h1>
          <p className="text-gray-400">Sprawdź i skoryguj stany magazynowe</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Location Selection */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Wybierz lokalizację</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Wybierz lokalizację</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Nr dokumentu (np. INW/2024/001)"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Uwagi"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Inventory Items */}
          {selectedLocation && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <h3 className="text-lg font-medium text-white">
                  Pozycje do przeliczenia ({filteredItems.length})
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj..."
                      className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 w-48"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyDifferences}
                      onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                    />
                    Tylko różnice
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Brak pozycji do przeliczenia</p>
                  {!selectedLocation && (
                    <p className="text-sm mt-2">Wybierz lokalizację, aby rozpocząć</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-gray-400 uppercase">
                    <div className="col-span-5">Produkt</div>
                    <div className="col-span-2 text-center">Stan systemowy</div>
                    <div className="col-span-3 text-center">Stan rzeczywisty</div>
                    <div className="col-span-2 text-center">Różnica</div>
                  </div>

                  {/* Items */}
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-12 gap-4 p-4 rounded-lg items-center ${
                        item.difference !== 0 
                          ? item.difference > 0 
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-red-500/10 border border-red-500/30'
                          : 'bg-slate-700/50'
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-3">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-600 rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-400">{item.variant.sku}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-white font-mono">{item.quantity}</span>
                        <span className="text-gray-400 text-sm ml-1">szt.</span>
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateCountedQuantity(item.id, Math.max(0, (item.countedQuantity ?? item.quantity) - 1))}
                            className="w-8 h-8 flex items-center justify-center bg-slate-600 text-white rounded hover:bg-slate-500"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={item.countedQuantity ?? ''}
                            onChange={(e) => updateCountedQuantity(item.id, e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={item.quantity.toString()}
                            min="0"
                            className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button
                            onClick={() => updateCountedQuantity(item.id, (item.countedQuantity ?? item.quantity) + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-slate-600 text-white rounded hover:bg-slate-500"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        {item.countedQuantity !== null && item.difference !== 0 ? (
                          <span className={`font-mono font-medium ${
                            item.difference > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 sticky top-6">
            <h3 className="text-lg font-medium text-white mb-4">Podsumowanie</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-400">
                <span>Lokalizacja:</span>
                <span className="text-white text-sm truncate max-w-[100px]">
                  {locations.find(l => l.id === selectedLocation)?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Pozycje z różnicami:</span>
                <span className="text-white">{itemsWithDifferences.length}</span>
              </div>
              
              <div className="pt-4 border-t border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Plus className="w-4 h-4 text-green-400" />
                    Nadwyżki:
                  </span>
                  <span className="text-green-400 font-medium">+{totalPositive} szt.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Minus className="w-4 h-4 text-red-400" />
                    Niedobory:
                  </span>
                  <span className="text-red-400 font-medium">-{totalNegative} szt.</span>
                </div>
              </div>
            </div>

            {itemsWithDifferences.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/20 rounded-lg mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-400">
                  {itemsWithDifferences.length} pozycji wymaga korekty
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || itemsWithDifferences.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Zatwierdź korekty
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
