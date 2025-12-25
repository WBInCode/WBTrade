'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  Trash2,
  Eye,
  EyeOff,
  Database,
  Clock,
  Package,
  FolderTree,
  Image,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// Types
// ============================================

interface BaselinkerConfig {
  inventoryId: string;
  tokenMasked: string;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BaselinkerInventory {
  inventory_id: number;
  name: string;
  description: string;
}

interface SyncLog {
  id: string;
  type: 'PRODUCTS' | 'CATEGORIES' | 'STOCK' | 'IMAGES';
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  itemsProcessed: number;
  errors: string[] | null;
  startedAt: string;
  completedAt: string | null;
}

interface SyncStatus {
  configured: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  currentSync: {
    id: string;
    type: string;
    status: string;
    startedAt: string;
  } | null;
  recentLogs: SyncLog[];
}

// ============================================
// API Functions
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();

  // For config endpoint, 404 means "not configured yet" - return the data with configured: false
  if (response.status === 404 && endpoint.includes('/config')) {
    return data as T;
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// ============================================
// Components
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    SUCCESS: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
    FAILED: { color: 'bg-red-500/20 text-red-400', icon: <XCircle className="w-4 h-4" /> },
    RUNNING: { color: 'bg-blue-500/20 text-blue-400', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    PENDING: { color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-4 h-4" /> },
  };

  const { color, icon } = config[status] || { color: 'bg-gray-500/20 text-gray-400', icon: null };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {status}
    </span>
  );
}

function SyncTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    PRODUCTS: <Package className="w-4 h-4" />,
    CATEGORIES: <FolderTree className="w-4 h-4" />,
    STOCK: <Database className="w-4 h-4" />,
    IMAGES: <Image className="w-4 h-4" />,
  };

  return icons[type] || <BarChart3 className="w-4 h-4" />;
}

// ============================================
// Main Page Component
// ============================================

export default function BaselinkerPage() {
  const { token } = useAuth();
  
  // State
  const [config, setConfig] = useState<BaselinkerConfig | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [inventories, setInventories] = useState<BaselinkerInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60);

  // ============================================
  // Data Loading
  // ============================================

  const loadConfig = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest<{ configured: boolean; config?: BaselinkerConfig }>(
        '/admin/baselinker/config',
        { method: 'GET' },
        token
      );
      
      if (response.configured && response.config) {
        setConfig(response.config);
        setSelectedInventoryId(response.config.inventoryId);
        setSyncEnabled(response.config.syncEnabled);
        setSyncInterval(response.config.syncIntervalMinutes);
      }
    } catch (err) {
      // Config not found is OK
      if (!(err instanceof Error && err.message.includes('not found'))) {
        console.error('Failed to load config:', err);
      }
    }
  }, [token]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest<SyncStatus>(
        '/admin/baselinker/status',
        { method: 'GET' },
        token
      );
      setStatus(response);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }, [token]);

  const loadInventories = useCallback(async () => {
    if (!token || !config) return;
    
    try {
      const response = await apiRequest<{ inventories: BaselinkerInventory[] }>(
        '/admin/baselinker/inventories',
        { method: 'GET' },
        token
      );
      setInventories(response.inventories);
    } catch (err) {
      console.error('Failed to load inventories:', err);
    }
  }, [token, config]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadConfig();
      await loadStatus();
      setLoading(false);
    }
    init();
  }, [loadConfig, loadStatus]);

  useEffect(() => {
    if (config) {
      loadInventories();
    }
  }, [config, loadInventories]);

  // Auto-refresh status every 10 seconds
  useEffect(() => {
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  // ============================================
  // Actions
  // ============================================

  const handleTestConnection = async () => {
    if (!token || !apiToken) return;
    
    setTesting(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; inventories?: BaselinkerInventory[]; message?: string }>(
        '/admin/baselinker/test',
        {
          method: 'POST',
          body: JSON.stringify({ apiToken }),
        },
        token
      );
      
      if (response.success) {
        setSuccess('Połączenie udane! Znaleziono ' + (response.inventories?.length || 0) + ' magazynów.');
        setInventories(response.inventories || []);
      } else {
        setError(response.message || 'Test połączenia nie powiódł się');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test połączenia nie powiódł się');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!token) {
      setError('Brak autoryzacji. Zaloguj się ponownie.');
      return;
    }
    
    if (!apiToken && !config) {
      setError('Token API jest wymagany dla pierwszej konfiguracji');
      return;
    }
    
    if (!selectedInventoryId) {
      setError('Wybierz lub wpisz ID magazynu');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ message: string; config: BaselinkerConfig }>(
        '/admin/baselinker/config',
        {
          method: 'POST',
          body: JSON.stringify({
            apiToken: apiToken || undefined,
            inventoryId: selectedInventoryId,
            syncEnabled,
            syncIntervalMinutes: syncInterval,
          }),
        },
        token
      );
      
      setConfig(response.config);
      setApiToken('');
      setSuccess('Konfiguracja zapisana pomyślnie');
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać konfiguracji');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!token || !confirm('Czy na pewno chcesz usunąć integrację Baselinker?')) return;
    
    try {
      await apiRequest(
        '/admin/baselinker/config',
        { method: 'DELETE' },
        token
      );
      
      setConfig(null);
      setInventories([]);
      setSelectedInventoryId('');
      setSuccess('Integracja usunięta');
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć integracji');
    }
  };

  const handleTriggerSync = async (type: string) => {
    if (!token) return;
    
    setSyncing(true);
    setError(null);
    
    try {
      await apiRequest(
        '/admin/baselinker/sync',
        {
          method: 'POST',
          body: JSON.stringify({ type }),
        },
        token
      );
      
      setSuccess(`Synchronizacja ${type} uruchomiona`);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się uruchomić synchronizacji');
    } finally {
      setSyncing(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integracja Baselinker</h1>
          <p className="text-gray-400 mt-1">
            Synchronizuj produkty, kategorie i stany magazynowe z Baselinker
          </p>
        </div>
        <button
          onClick={() => { loadConfig(); loadStatus(); }}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Błąd</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-400 font-medium">Sukces</p>
            <p className="text-green-300 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Konfiguracja</h2>
          </div>

          <div className="space-y-4">
            {/* API Token */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token API {config && <span className="text-gray-500">(pozostaw puste aby zachować obecny)</span>}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder={config ? config.tokenMasked : 'Wprowadź token API Baselinker'}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1.5 text-gray-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection Button */}
            {apiToken && (
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testowanie...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Testuj połączenie
                  </>
                )}
              </button>
            )}

            {/* Inventory Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Magazyn
              </label>
              {inventories.length > 0 ? (
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Wybierz magazyn</option>
                  {inventories.map((inv) => (
                    <option key={inv.inventory_id} value={inv.inventory_id.toString()}>
                      {inv.name} (ID: {inv.inventory_id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  placeholder="ID magazynu (np. 34449)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              )}
            </div>

            {/* Sync Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interwał synchronizacji
                </label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value={15}>15 minut</option>
                  <option value={30}>30 minut</option>
                  <option value={60}>1 godzina</option>
                  <option value={120}>2 godziny</option>
                  <option value={360}>6 godzin</option>
                  <option value={720}>12 godzin</option>
                  <option value={1440}>24 godziny</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Automatyczna synchronizacja
                </label>
                <button
                  onClick={() => setSyncEnabled(!syncEnabled)}
                  className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    syncEnabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-700 text-gray-400 border border-gray-600'
                  }`}
                >
                  {syncEnabled ? (
                    <>
                      <Play className="w-4 h-4" />
                      Włączona
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Wyłączona
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveConfig}
                disabled={saving || (!apiToken && !config) || !selectedInventoryId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Zapisz konfigurację
                  </>
                )}
              </button>

              {config && (
                <button
                  onClick={handleDeleteConfig}
                  className="p-2.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Usuń integrację"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <RefreshCw className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Synchronizacja</h2>
            </div>
            {status?.currentSync && (
              <StatusBadge status={status.currentSync.status} />
            )}
          </div>

          {/* Status Info */}
          {status && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Ostatnia synchronizacja</p>
                  <p className="text-white font-medium">
                    {status.lastSyncAt
                      ? new Date(status.lastSyncAt).toLocaleString('pl-PL')
                      : 'Nigdy'}
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Następna synchronizacja</p>
                  <p className="text-white font-medium">
                    {status.nextSyncAt
                      ? new Date(status.nextSyncAt).toLocaleString('pl-PL')
                      : 'Nie zaplanowano'}
                  </p>
                </div>
              </div>

              {status.currentSync && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-blue-400 font-medium">
                      Synchronizacja {status.currentSync.type} w toku...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Sync Buttons */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => handleTriggerSync('full')}
              disabled={syncing || !config}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Pełna sync
            </button>
            <button
              onClick={() => handleTriggerSync('categories')}
              disabled={syncing || !config}
              className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FolderTree className="w-4 h-4" />
              Kategorie
            </button>
            <button
              onClick={() => handleTriggerSync('products')}
              disabled={syncing || !config}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              Produkty
            </button>
            <button
              onClick={() => handleTriggerSync('stock')}
              disabled={syncing || !config}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              Stany
            </button>
          </div>

          {/* Recent Logs */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Historia synchronizacji</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {status?.recentLogs && status.recentLogs.length > 0 ? (
                status.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-gray-900 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <SyncTypeIcon type={log.type} />
                      <div>
                        <p className="text-white text-sm font-medium">{log.type}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(log.startedAt).toLocaleString('pl-PL')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">
                        {log.itemsProcessed} elementów
                      </span>
                      <StatusBadge status={log.status} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  Brak historii synchronizacji
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Errors Section */}
      {status?.recentLogs?.some((log) => log.errors && log.errors.length > 0) && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Błędy synchronizacji</h2>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {status.recentLogs
              .filter((log) => log.errors && log.errors.length > 0)
              .slice(0, 3)
              .flatMap((log) =>
                (log.errors || []).map((err, idx) => (
                  <div key={`${log.id}-${idx}`} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{err}</p>
                    <p className="text-red-500/60 text-xs mt-1">
                      {log.type} - {new Date(log.startedAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                ))
              )}
          </div>
        </div>
      )}
    </div>
  );
}
