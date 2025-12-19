'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  AlertTriangle,
  Package,
  RefreshCw,
  MapPin,
  Settings,
  TrendingDown,
  Search,
  Bell,
  ExternalLink
} from 'lucide-react';

interface LowStockItem {
  variantId: string;
  variantName: string | null;
  productName: string;
  sku: string;
  locationId: string;
  locationName: string;
  quantity: number;
  minimum: number;
  reserved: number;
  available: number;
}

export default function AlertsPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimumModal, setShowMinimumModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LowStockItem | null>(null);
  const [newMinimum, setNewMinimum] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [token]);

  async function loadAlerts() {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/api/inventory/alerts/low-stock', token);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAlerts = alerts.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.sku.toLowerCase().includes(query) ||
      item.productName.toLowerCase().includes(query) ||
      item.locationName.toLowerCase().includes(query)
    );
  });

  // Group by severity
  const critical = filteredAlerts.filter(a => a.available <= 0);
  const warning = filteredAlerts.filter(a => a.available > 0);

  const openMinimumModal = (item: LowStockItem) => {
    setSelectedItem(item);
    setNewMinimum(item.minimum);
    setShowMinimumModal(true);
  };

  const handleSetMinimum = async () => {
    if (!token || !selectedItem) return;
    try {
      setSaving(true);
      const res = await api.post('/api/inventory/minimum', {
        variantId: selectedItem.variantId,
        locationId: selectedItem.locationId,
        minimum: newMinimum
      }, token);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Błąd zapisu');
      }

      setShowMinimumModal(false);
      loadAlerts();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const AlertCard = ({ item, isCritical }: { item: LowStockItem; isCritical: boolean }) => (
    <div className={`p-4 rounded-lg border ${
      isCritical 
        ? 'bg-red-500/10 border-red-500/30' 
        : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${
          isCritical ? 'bg-red-500/20' : 'bg-yellow-500/20'
        }`}>
          {isCritical ? (
            <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} />
          ) : (
            <TrendingDown className="w-5 h-5 text-yellow-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white font-medium">{item.productName}</p>
              <p className="text-sm text-gray-400">
                {item.sku} {item.variantName && `• ${item.variantName}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openMinimumModal(item)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Ustaw minimum"
              >
                <Settings className="w-4 h-4" />
              </button>
              <Link
                href={`/warehouse/receive`}
                className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                title="Przyjmij towar"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-gray-400">
              <MapPin className="w-4 h-4" />
              {item.locationName}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">
                Stan: <span className={isCritical ? 'text-red-400' : 'text-yellow-400'}>{item.quantity}</span>
              </span>
              <span className="text-gray-400">
                Zarezerwowane: <span className="text-orange-400">{item.reserved}</span>
              </span>
              <span className="text-gray-400">
                Dostępne: <span className={isCritical ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>{item.available}</span>
              </span>
              <span className="text-gray-400">
                Minimum: <span className="text-white">{item.minimum}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/warehouse"
            className="p-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Alerty niskich stanów</h1>
            <p className="text-gray-400">Produkty wymagające uzupełnienia</p>
          </div>
        </div>
        <button
          onClick={() => loadAlerts()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Krytyczne (brak na stanie)</p>
              <p className="text-2xl font-bold text-red-400">{critical.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ostrzeżenia (niski stan)</p>
              <p className="text-2xl font-bold text-yellow-400">{warning.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj po SKU, nazwie lub lokalizacji..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <Bell className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-50" />
          <p className="text-white font-medium">Brak alertów</p>
          <p className="text-gray-400 text-sm mt-2">Wszystkie produkty mają wystarczający stan magazynowy</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Critical */}
          {critical.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Krytyczne - Brak na stanie ({critical.length})
              </h3>
              <div className="space-y-3">
                {critical.map((item, index) => (
                  <AlertCard key={`${item.variantId}-${item.locationId}-${index}`} item={item} isCritical={true} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warning.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-yellow-400 mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Ostrzeżenia - Niski stan ({warning.length})
              </h3>
              <div className="space-y-3">
                {warning.map((item, index) => (
                  <AlertCard key={`${item.variantId}-${item.locationId}-${index}`} item={item} isCritical={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minimum Stock Modal */}
      {showMinimumModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-medium text-white">Ustaw minimum</h3>
              <p className="text-sm text-gray-400 mt-1">{selectedItem.productName}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Minimalny stan magazynowy
                </label>
                <input
                  type="number"
                  value={newMinimum}
                  onChange={(e) => setNewMinimum(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alert pojawi się gdy stan spadnie poniżej tej wartości
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMinimumModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSetMinimum}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
