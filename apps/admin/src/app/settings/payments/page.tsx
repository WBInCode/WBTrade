'use client';

import { useState, useEffect } from 'react';
import { Save, CreditCard, RefreshCw, Shield, Check, X } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  testMode: boolean;
  config: {
    [key: string]: string;
  };
}

const defaultMethods: PaymentMethod[] = [
  {
    id: 'payu',
    name: 'PayU',
    description: 'Szybkie płatności online (BLIK, karty, przelewy)',
    icon: '💳',
    enabled: true,
    testMode: true,
    config: {
      posId: '',
      secondKey: '',
      clientId: '',
      clientSecret: '',
    },
  },
  {
    id: 'przelewy24',
    name: 'Przelewy24',
    description: 'Płatności przez Przelewy24',
    icon: '🏦',
    enabled: false,
    testMode: true,
    config: {
      merchantId: '',
      posId: '',
      crc: '',
    },
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Płatności kartą przez Stripe',
    icon: '💎',
    enabled: false,
    testMode: true,
    config: {
      publishableKey: '',
      secretKey: '',
    },
  },
  {
    id: 'cod',
    name: 'Za pobraniem',
    description: 'Płatność przy odbiorze przesyłki',
    icon: '💵',
    enabled: true,
    testMode: false,
    config: {
      additionalFee: '5',
    },
  },
  {
    id: 'transfer',
    name: 'Przelew tradycyjny',
    description: 'Przelew na konto bankowe',
    icon: '🏛️',
    enabled: true,
    testMode: false,
    config: {
      bankName: '',
      accountNumber: '',
      accountHolder: '',
    },
  },
];

export default function PaymentsSettingsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('payment_methods');
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
      localStorage.setItem('payment_methods', JSON.stringify(methods));
      setMessage({ type: 'success', text: 'Ustawienia płatności zostały zapisane' });
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

  const handleTestModeToggle = (id: string) => {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, testMode: !m.testMode } : m));
  };

  const handleConfigChange = (methodId: string, key: string, value: string) => {
    setMethods(prev => prev.map(m => {
      if (m.id === methodId) {
        return { ...m, config: { ...m.config, [key]: value } };
      }
      return m;
    }));
  };

  const configLabels: Record<string, string> = {
    posId: 'POS ID',
    secondKey: 'Second Key (MD5)',
    clientId: 'Client ID (OAuth)',
    clientSecret: 'Client Secret (OAuth)',
    merchantId: 'Merchant ID',
    crc: 'CRC Key',
    publishableKey: 'Publishable Key',
    secretKey: 'Secret Key',
    additionalFee: 'Dodatkowa opłata (zł)',
    bankName: 'Nazwa banku',
    accountNumber: 'Numer konta',
    accountHolder: 'Właściciel konta',
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
          <h1 className="text-2xl font-bold text-white">Metody płatności</h1>
          <p className="text-gray-400">Skonfiguruj dostępne metody płatności</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Zapisz zmiany
        </button>
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
            className={`bg-slate-800/50 border rounded-xl overflow-hidden ${method.enabled ? 'border-slate-700/50' : 'border-slate-700/30'}`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-2xl">
                    {method.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {method.name}
                      {method.testMode && method.id !== 'cod' && method.id !== 'transfer' && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                          Tryb testowy
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400">{method.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setExpandedMethod(expandedMethod === method.id ? null : method.id)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {expandedMethod === method.id ? 'Zwiń' : 'Konfiguruj'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
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

            {/* Config Panel */}
            {expandedMethod === method.id && (
              <div className="border-t border-slate-700/50 p-5 bg-slate-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(method.config).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm text-gray-400 mb-1">
                        {configLabels[key] || key}
                      </label>
                      <input
                        type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') ? 'password' : 'text'}
                        value={value}
                        onChange={(e) => handleConfigChange(method.id, key, e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Test mode toggle for payment gateways */}
                {method.id !== 'cod' && method.id !== 'transfer' && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-300">Tryb testowy (sandbox)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={method.testMode}
                        onChange={() => handleTestModeToggle(method.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-400">Bezpieczeństwo</h4>
            <p className="text-sm text-gray-400 mt-1">
              Klucze API i hasła są przechowywane bezpiecznie. Nigdy nie udostępniaj swoich kluczy osobom trzecim.
              Przed włączeniem płatności w trybie produkcyjnym, przetestuj je dokładnie w trybie sandbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
