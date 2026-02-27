'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/api';
import { Loader2, Plus, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

interface PriceRule {
  id: string;
  priceFrom: number;
  priceTo: number;
  multiplier: number;
  addToPrice: number;
}

type Warehouse = 'leker' | 'btp' | 'hp';

const WAREHOUSES: { key: Warehouse; label: string; description: string }[] = [
  { key: 'leker', label: 'Leker', description: 'Magazyn Chynów' },
  { key: 'btp', label: 'BTP', description: 'Magazyn Chotów' },
  { key: 'hp', label: 'HP', description: 'Magazyn Zielona Góra' },
];

const DEFAULT_RULES: PriceRule[] = [
  { id: '1', priceFrom: 0, priceTo: 35, multiplier: 1.0, addToPrice: 0 },
  { id: '2', priceFrom: 35.01, priceTo: 100, multiplier: 1.0, addToPrice: 0 },
  { id: '3', priceFrom: 100.01, priceTo: 200, multiplier: 1.0, addToPrice: 0 },
  { id: '4', priceFrom: 200.01, priceTo: 300, multiplier: 1.0, addToPrice: 0 },
  { id: '5', priceFrom: 300.01, priceTo: 400, multiplier: 1.0, addToPrice: 0 },
  { id: '6', priceFrom: 400.01, priceTo: 500, multiplier: 1.0, addToPrice: 0 },
  { id: '7', priceFrom: 500.01, priceTo: 600, multiplier: 1.0, addToPrice: 0 },
  { id: '8', priceFrom: 600.01, priceTo: 700, multiplier: 1.0, addToPrice: 0 },
  { id: '9', priceFrom: 700.01, priceTo: 800, multiplier: 1.0, addToPrice: 0 },
  { id: '10', priceFrom: 800.01, priceTo: 900, multiplier: 1.0, addToPrice: 0 },
  { id: '11', priceFrom: 900.01, priceTo: 1000, multiplier: 1.0, addToPrice: 0 },
  { id: '12', priceFrom: 1000.01, priceTo: 100000, multiplier: 1.0, addToPrice: 0 },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function PricingPage() {
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse>('leker');
  const [rules, setRules] = useState<Record<Warehouse, PriceRule[]>>({
    leker: [],
    btp: [],
    hp: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<Warehouse, boolean>>({
    leker: false,
    btp: false,
    hp: false,
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const results: Record<Warehouse, PriceRule[]> = { leker: [], btp: [], hp: [] };

      for (const wh of WAREHOUSES) {
        try {
          const response = await fetch(`${API_URL}/admin/settings/price_rules_${wh.key}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });

          if (response.ok) {
            const data = await response.json();
            const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              results[wh.key] = parsed;
            } else {
              results[wh.key] = [...DEFAULT_RULES];
            }
          } else {
            results[wh.key] = [...DEFAULT_RULES];
          }
        } catch {
          results[wh.key] = [...DEFAULT_RULES];
        }
      }

      setRules(results);
    } catch (error) {
      console.error('Error fetching price rules:', error);
      setMessage({ type: 'error', text: 'Błąd podczas ładowania reguł cenowych' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const saveRules = async (warehouse: Warehouse) => {
    setSaving(true);
    setMessage(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/settings/price_rules_${warehouse}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ value: rules[warehouse] }),
      });

      if (!response.ok) throw new Error('Błąd zapisu');

      setMessage({ type: 'success', text: `Reguły cenowe dla ${WAREHOUSES.find(w => w.key === warehouse)?.label} zapisane pomyślnie!` });
      setHasChanges(prev => ({ ...prev, [warehouse]: false }));
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas zapisywania reguł cenowych' });
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (warehouse: Warehouse, ruleId: string, field: keyof PriceRule, value: string) => {
    setRules(prev => ({
      ...prev,
      [warehouse]: prev[warehouse].map(rule =>
        rule.id === ruleId
          ? { ...rule, [field]: field === 'id' ? value : parseFloat(value) || 0 }
          : rule
      ),
    }));
    setHasChanges(prev => ({ ...prev, [warehouse]: true }));
  };

  const addRule = (warehouse: Warehouse) => {
    const warehouseRules = rules[warehouse];
    const lastRule = warehouseRules[warehouseRules.length - 1];
    const newFrom = lastRule ? parseFloat((lastRule.priceTo + 0.01).toFixed(2)) : 0;

    const newRule: PriceRule = {
      id: generateId(),
      priceFrom: newFrom,
      priceTo: newFrom + 100,
      multiplier: 1.0,
      addToPrice: 0,
    };

    setRules(prev => ({
      ...prev,
      [warehouse]: [...prev[warehouse], newRule],
    }));
    setHasChanges(prev => ({ ...prev, [warehouse]: true }));
  };

  const removeRule = (warehouse: Warehouse, ruleId: string) => {
    setRules(prev => ({
      ...prev,
      [warehouse]: prev[warehouse].filter(rule => rule.id !== ruleId),
    }));
    setHasChanges(prev => ({ ...prev, [warehouse]: true }));
  };

  const copyRules = (fromWarehouse: Warehouse) => {
    const from = rules[fromWarehouse];
    const targets = WAREHOUSES.filter(w => w.key !== fromWarehouse);
    
    setRules(prev => {
      const updated = { ...prev };
      for (const target of targets) {
        updated[target.key] = from.map(rule => ({ ...rule, id: generateId() }));
      }
      return updated;
    });
    setHasChanges(prev => {
      const updated = { ...prev };
      for (const target of targets) {
        updated[target.key] = true;
      }
      return updated;
    });
    setMessage({ type: 'success', text: `Reguły skopiowane z ${WAREHOUSES.find(w => w.key === fromWarehouse)?.label} do pozostałych magazynów` });
  };

  const saveAllRules = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = getAuthToken();
      for (const wh of WAREHOUSES) {
        const response = await fetch(`${API_URL}/admin/settings/price_rules_${wh.key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ value: rules[wh.key] }),
        });
        if (!response.ok) throw new Error(`Błąd zapisu dla ${wh.label}`);
      }
      setMessage({ type: 'success', text: 'Wszystkie reguły cenowe zapisane pomyślnie!' });
      setHasChanges({ leker: false, btp: false, hp: false });
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas zapisywania reguł cenowych' });
    } finally {
      setSaving(false);
    }
  };

  // Calculate example price
  const calculateExamplePrice = (sourcePrice: number, warehouse: Warehouse): string => {
    const warehouseRules = rules[warehouse];
    for (const rule of warehouseRules) {
      if (sourcePrice >= rule.priceFrom && sourcePrice <= rule.priceTo) {
        const result = sourcePrice * rule.multiplier + rule.addToPrice;
        return result.toFixed(2);
      }
    }
    return '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-3 text-slate-400">Ładowanie reguł cenowych...</span>
      </div>
    );
  }

  const currentRules = rules[activeWarehouse];
  const anyChanges = Object.values(hasChanges).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cennik — Mnożniki cen</h1>
          <p className="text-slate-400 mt-1">
            Ustaw mnożniki cen i dodatki w zależności od zakresu ceny hurtowej dla każdego magazynu
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => copyRules(activeWarehouse)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            Kopiuj do pozostałych
          </button>
          <button
            onClick={saveAllRules}
            disabled={saving || !anyChanges}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz wszystko
          </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Warehouse tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
        {WAREHOUSES.map(wh => (
          <button
            key={wh.key}
            onClick={() => setActiveWarehouse(wh.key)}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeWarehouse === wh.key
                ? 'bg-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{wh.label}</span>
              {hasChanges[wh.key] && (
                <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Niezapisane zmiany" />
              )}
            </div>
            <div className={`text-xs mt-0.5 ${activeWarehouse === wh.key ? 'text-orange-200' : 'text-slate-500'}`}>
              {wh.description}
            </div>
          </button>
        ))}
      </div>

      {/* Rules table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 px-6 py-3 bg-slate-900/50 border-b border-slate-700/50">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cena od</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cena do</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mnożnik ceny</div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dodaj do ceny</div>
          <div className="w-10"></div>
        </div>

        {/* Rules rows */}
        <div className="divide-y divide-slate-700/30">
          {currentRules.map((rule, index) => (
            <div
              key={rule.id}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 px-6 py-3 hover:bg-slate-700/20 transition-colors items-center"
            >
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={rule.priceFrom}
                  onChange={e => updateRule(activeWarehouse, rule.id, 'priceFrom', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={rule.priceTo}
                  onChange={e => updateRule(activeWarehouse, rule.id, 'priceTo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.0001"
                  value={rule.multiplier}
                  onChange={e => updateRule(activeWarehouse, rule.id, 'multiplier', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={rule.addToPrice}
                  onChange={e => updateRule(activeWarehouse, rule.id, 'addToPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <button
                  onClick={() => removeRule(activeWarehouse, rule.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Usuń regułę"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add button */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={() => addRule(activeWarehouse)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj
          </button>
        </div>
      </div>

      {/* Info and Save */}
      <div className="flex items-start justify-between">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 max-w-xl">
          <h3 className="text-sm font-medium text-white mb-2">Jak działa mnożnik ceny?</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Końcowa cena = <span className="text-orange-400 font-mono">Cena hurtowa × Mnożnik + Dodaj do ceny</span>
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Np &apos;1&apos; aby zwiększyć cenę o złotówkę w stosunku do ceny hurtowni
            <br />
            Np &apos;1.20&apos; dla narzutu w wysokości 20%
          </p>
        </div>

        <button
          onClick={() => saveRules(activeWarehouse)}
          disabled={saving || !hasChanges[activeWarehouse]}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Zapisz {WAREHOUSES.find(w => w.key === activeWarehouse)?.label}
        </button>
      </div>

      {/* Price simulator */}
      <PriceSimulator
        warehouse={activeWarehouse}
        calculatePrice={calculateExamplePrice}
        warehouseLabel={WAREHOUSES.find(w => w.key === activeWarehouse)?.label || ''}
      />
    </div>
  );
}

function PriceSimulator({
  warehouse,
  calculatePrice,
  warehouseLabel,
}: {
  warehouse: Warehouse;
  calculatePrice: (price: number, wh: Warehouse) => string;
  warehouseLabel: string;
}) {
  const [testPrice, setTestPrice] = useState('50');
  const examplePrices = [10, 25, 50, 75, 120, 250, 450, 750, 1500];

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-sm font-medium text-white mb-4">Symulator ceny — {warehouseLabel}</h3>

      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm text-slate-400">Testowa cena hurtowa:</label>
        <input
          type="number"
          step="0.01"
          value={testPrice}
          onChange={e => setTestPrice(e.target.value)}
          className="w-40 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <span className="text-sm text-slate-400">→</span>
        <span className="text-lg font-bold text-orange-400">
          {calculatePrice(parseFloat(testPrice) || 0, warehouse)} zł
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {examplePrices.map(price => (
          <div key={price} className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Hurt: {price} zł</div>
            <div className="text-sm font-medium text-white">{calculatePrice(price, warehouse)} zł</div>
          </div>
        ))}
      </div>
    </div>
  );
}
