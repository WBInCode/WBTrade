'use client';

import { useState, useEffect } from 'react';
import { Save, Percent, Plus, Trash2, RefreshCw, Edit2 } from 'lucide-react';

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  description: string;
  isDefault: boolean;
}

const defaultTaxRates: TaxRate[] = [
  {
    id: '1',
    name: 'VAT 23%',
    rate: 23,
    description: 'Standardowa stawka VAT',
    isDefault: true,
  },
  {
    id: '2',
    name: 'VAT 8%',
    rate: 8,
    description: 'Obniżona stawka VAT (np. żywność)',
    isDefault: false,
  },
  {
    id: '3',
    name: 'VAT 5%',
    rate: 5,
    description: 'Obniżona stawka VAT (np. książki)',
    isDefault: false,
  },
  {
    id: '4',
    name: 'VAT 0%',
    rate: 0,
    description: 'Stawka zerowa VAT',
    isDefault: false,
  },
];

interface TaxSettings {
  pricesIncludeTax: boolean;
  displayTaxInCart: boolean;
  taxBasedOn: 'shipping' | 'billing' | 'store';
  taxRoundingMode: 'round' | 'ceil' | 'floor';
}

const defaultSettings: TaxSettings = {
  pricesIncludeTax: true,
  displayTaxInCart: true,
  taxBasedOn: 'shipping',
  taxRoundingMode: 'round',
};

export default function TaxesSettingsPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [settings, setSettings] = useState<TaxSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedRates = localStorage.getItem('tax_rates');
      const savedSettings = localStorage.getItem('tax_settings');
      
      if (savedRates) {
        setTaxRates(JSON.parse(savedRates));
      } else {
        setTaxRates(defaultTaxRates);
      }
      
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setTaxRates(defaultTaxRates);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem('tax_rates', JSON.stringify(taxRates));
      localStorage.setItem('tax_settings', JSON.stringify(settings));
      setMessage({ type: 'success', text: 'Ustawienia podatków zostały zapisane' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Nie udało się zapisać ustawień' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = (id: string) => {
    setTaxRates(prev => prev.map(r => ({ ...r, isDefault: r.id === id })));
  };

  const handleDelete = (id: string) => {
    const rate = taxRates.find(r => r.id === id);
    if (rate?.isDefault) {
      alert('Nie można usunąć domyślnej stawki. Najpierw ustaw inną stawkę jako domyślną.');
      return;
    }
    if (confirm('Czy na pewno chcesz usunąć tę stawkę?')) {
      setTaxRates(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEdit = (rate: TaxRate) => {
    setEditingRate({ ...rate });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRate({
      id: Date.now().toString(),
      name: '',
      rate: 0,
      description: '',
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const handleSaveRate = () => {
    if (!editingRate) return;
    
    const exists = taxRates.find(r => r.id === editingRate.id);
    if (exists) {
      setTaxRates(prev => prev.map(r => r.id === editingRate.id ? editingRate : r));
    } else {
      setTaxRates(prev => [...prev, editingRate]);
    }
    setIsModalOpen(false);
    setEditingRate(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Podatki</h1>
          <p className="text-gray-400">Skonfiguruj stawki VAT i ustawienia podatkowe</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj stawkę
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz zmiany
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* General Settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ustawienia ogólne</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
            <div>
              <p className="text-white font-medium">Ceny zawierają VAT</p>
              <p className="text-sm text-gray-400">Ceny produktów są podawane brutto</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pricesIncludeTax}
                onChange={() => setSettings(prev => ({ ...prev, pricesIncludeTax: !prev.pricesIncludeTax }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
            <div>
              <p className="text-white font-medium">Pokazuj VAT w koszyku</p>
              <p className="text-sm text-gray-400">Wyświetlaj podział na netto/VAT</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.displayTaxInCart}
                onChange={() => setSettings(prev => ({ ...prev, displayTaxInCart: !prev.displayTaxInCart }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Obliczaj VAT na podstawie</label>
            <select
              value={settings.taxBasedOn}
              onChange={(e) => setSettings(prev => ({ ...prev, taxBasedOn: e.target.value as TaxSettings['taxBasedOn'] }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="shipping">Adres dostawy</option>
              <option value="billing">Adres rozliczeniowy</option>
              <option value="store">Lokalizacja sklepu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Zaokrąglanie kwot</label>
            <select
              value={settings.taxRoundingMode}
              onChange={(e) => setSettings(prev => ({ ...prev, taxRoundingMode: e.target.value as TaxSettings['taxRoundingMode'] }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="round">Standardowe (matematyczne)</option>
              <option value="ceil">W górę</option>
              <option value="floor">W dół</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Stawki VAT</h3>
        <div className="space-y-3">
          {taxRates.map((rate) => (
            <div
              key={rate.id}
              className={`flex items-center justify-between p-4 rounded-lg ${rate.isDefault ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-slate-700/30'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Percent className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{rate.name}</p>
                    {rate.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                        Domyślna
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{rate.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white mr-4">{rate.rate}%</span>
                {!rate.isDefault && (
                  <button
                    onClick={() => handleSetDefault(rate.id)}
                    className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  >
                    Ustaw domyślną
                  </button>
                )}
                <button
                  onClick={() => handleEdit(rate)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(rate.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingRate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {taxRates.find(r => r.id === editingRate.id) ? 'Edytuj stawkę' : 'Dodaj stawkę'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nazwa</label>
                <input
                  type="text"
                  value={editingRate.name}
                  onChange={(e) => setEditingRate({ ...editingRate, name: e.target.value })}
                  placeholder="np. VAT 23%"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stawka (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editingRate.rate}
                  onChange={(e) => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Opis</label>
                <input
                  type="text"
                  value={editingRate.description}
                  onChange={(e) => setEditingRate({ ...editingRate, description: e.target.value })}
                  placeholder="np. Standardowa stawka VAT"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setIsModalOpen(false); setEditingRate(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveRate}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
