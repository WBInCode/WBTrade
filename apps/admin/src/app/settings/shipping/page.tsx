'use client';

import { useState, useEffect } from 'react';
import { Save, Truck, Plus, Trash2, RefreshCw, Edit2 } from 'lucide-react';

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  freeAbove: number | null;
  estimatedDays: string;
  enabled: boolean;
}

const defaultMethods: ShippingMethod[] = [
  {
    id: '1',
    name: 'Kurier DPD',
    description: 'Dostawa kurierem DPD',
    price: 14.99,
    freeAbove: 200,
    estimatedDays: '1-2 dni robocze',
    enabled: true,
  },
  {
    id: '2',
    name: 'Kurier InPost',
    description: 'Dostawa kurierem InPost',
    price: 12.99,
    freeAbove: 200,
    estimatedDays: '1-2 dni robocze',
    enabled: true,
  },
  {
    id: '3',
    name: 'Paczkomat InPost',
    description: 'Odbiór w paczkomacie InPost',
    price: 9.99,
    freeAbove: 150,
    estimatedDays: '1-2 dni robocze',
    enabled: true,
  },
  {
    id: '4',
    name: 'Poczta Polska',
    description: 'Przesyłka Pocztą Polską',
    price: 11.99,
    freeAbove: null,
    estimatedDays: '2-4 dni robocze',
    enabled: false,
  },
];

export default function ShippingSettingsPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('shipping_methods');
      if (saved) {
        setMethods(JSON.parse(saved));
      } else {
        setMethods(defaultMethods);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMethods(defaultMethods);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem('shipping_methods', JSON.stringify(methods));
      setMessage({ type: 'success', text: 'Ustawienia dostawy zostały zapisane' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Nie udało się zapisać ustawień' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (id: string) => {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć tę metodę dostawy?')) {
      setMethods(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleEdit = (method: ShippingMethod) => {
    setEditingMethod({ ...method });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingMethod({
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      freeAbove: null,
      estimatedDays: '',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleSaveMethod = () => {
    if (!editingMethod) return;
    
    const exists = methods.find(m => m.id === editingMethod.id);
    if (exists) {
      setMethods(prev => prev.map(m => m.id === editingMethod.id ? editingMethod : m));
    } else {
      setMethods(prev => [...prev, editingMethod]);
    }
    setIsModalOpen(false);
    setEditingMethod(null);
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
          <h1 className="text-2xl font-bold text-white">Metody dostawy</h1>
          <p className="text-gray-400">Zarządzaj opcjami dostawy dla klientów</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj metodę
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

      {/* Methods List */}
      <div className="space-y-4">
        {methods.map((method) => (
          <div
            key={method.id}
            className={`bg-slate-800/50 border rounded-xl p-5 ${method.enabled ? 'border-slate-700/50' : 'border-slate-700/30 opacity-60'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{method.name}</h3>
                  <p className="text-sm text-gray-400">{method.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-green-400 font-medium">{method.price.toFixed(2)} zł</span>
                    {method.freeAbove && (
                      <span className="text-gray-500">
                        Darmowa od {method.freeAbove} zł
                      </span>
                    )}
                    <span className="text-gray-500">{method.estimatedDays}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(method)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <label className="relative inline-flex items-center cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={() => handleToggle(method.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {methods.find(m => m.id === editingMethod.id) ? 'Edytuj metodę' : 'Dodaj metodę'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nazwa</label>
                <input
                  type="text"
                  value={editingMethod.name}
                  onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Opis</label>
                <input
                  type="text"
                  value={editingMethod.description}
                  onChange={(e) => setEditingMethod({ ...editingMethod, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cena (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMethod.price}
                    onChange={(e) => setEditingMethod({ ...editingMethod, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Darmowa od (zł)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingMethod.freeAbove || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, freeAbove: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Brak"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Czas dostawy</label>
                <input
                  type="text"
                  value={editingMethod.estimatedDays}
                  onChange={(e) => setEditingMethod({ ...editingMethod, estimatedDays: e.target.value })}
                  placeholder="np. 1-2 dni robocze"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setIsModalOpen(false); setEditingMethod(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveMethod}
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
