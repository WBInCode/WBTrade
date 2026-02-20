'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  ArrowLeft,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  TrendingUp,
  Tag,
  DollarSign,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ============================================
// Types
// ============================================

interface SyncLog {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  itemsProcessed: number;
  itemsChanged: number;
  changedSkus: any[] | null;
  errors: string[] | null;
  startedAt: string;
  completedAt: string | null;
}

interface SyncStatus {
  configured: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  currentSync: {
    id: string;
    type: string;
    status: string;
    startedAt: string;
  } | null;
  recentLogs: SyncLog[];
}

interface ChangedProduct {
  sku: string;
  name: string;
  changes: string[];
}

// ============================================
// API Helper
// ============================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
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

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// ============================================
// Main Page Component
// ============================================

export default function ProductUpdatePage() {
  const { token } = useAuth();

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSyncLogId, setActiveSyncLogId] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncLog | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [productUpdateLogs, setProductUpdateLogs] = useState<SyncLog[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Load status & logs
  // ============================================

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiRequest<SyncStatus>(
        '/admin/baselinker/status?limit=50',
        { method: 'GET' },
        token,
      );
      setStatus(response);

      // Filter logs for product update syncs
      const productLogs = response.recentLogs.filter(
        (log) => log.type === 'PRODUCTS',
      );
      setProductUpdateLogs(productLogs);

      // Check if active sync finished
      if (activeSyncLogId) {
        const activeLog = response.recentLogs.find(
          (l) => l.id === activeSyncLogId,
        );
        if (activeLog && (activeLog.status === 'SUCCESS' || activeLog.status === 'FAILED')) {
          setLastSyncResult(activeLog);
          setSyncing(false);
          setActiveSyncLogId(null);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (activeLog.status === 'SUCCESS') {
            const changedCount = activeLog.itemsChanged || 0;
            setSuccess(
              changedCount > 0
                ? `Zaktualizowano ${activeLog.itemsProcessed} produktów (${changedCount} zmienionych)`
                : `Sprawdzono ${activeLog.itemsProcessed} produktów — brak zmian`,
            );
          } else {
            setError(
              `Synchronizacja zakończona z błędami: ${activeLog.errors?.join(', ') || 'Nieznany błąd'}`,
            );
          }
        }
      }

      // Also check if there's an ongoing RUNNING sync
      if (response.currentSync && response.currentSync.type === 'PRODUCTS') {
        setSyncing(true);
        setActiveSyncLogId(response.currentSync.id);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  }, [token, activeSyncLogId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Polling while syncing
  useEffect(() => {
    if (syncing && !pollingRef.current) {
      pollingRef.current = setInterval(loadStatus, 3000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [syncing, loadStatus]);

  // ============================================
  // Trigger product update
  // ============================================

  const handleUpdateProducts = async () => {
    if (!token || syncing) return;

    setError(null);
    setSuccess(null);
    setSyncing(true);
    setLastSyncResult(null);

    try {
      const result = await apiRequest<{ syncLogId: string }>(
        '/admin/baselinker/sync',
        {
          method: 'POST',
          body: JSON.stringify({ type: 'products', mode: 'update-only' }),
        },
        token,
      );
      setActiveSyncLogId(result.syncLogId);

      // Start polling
      pollingRef.current = setInterval(loadStatus, 3000);
    } catch (err) {
      setSyncing(false);
      setError(err instanceof Error ? err.message : 'Nie udało się uruchomić aktualizacji');
    }
  };

  // ============================================
  // Helpers
  // ============================================

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function formatDuration(startStr: string, endStr: string | null) {
    if (!endStr) return 'W trakcie...';
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diffMs = end - start;
    if (diffMs < 1000) return `${diffMs}ms`;
    if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
    return `${Math.floor(diffMs / 60000)}m ${Math.round((diffMs % 60000) / 1000)}s`;
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'SUCCESS': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      case 'RUNNING': return 'text-blue-400';
      case 'PENDING': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }

  function getStatusBg(status: string) {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/10 border-green-500/20';
      case 'FAILED': return 'bg-red-500/10 border-red-500/20';
      case 'RUNNING': return 'bg-blue-500/10 border-blue-500/20';
      case 'PENDING': return 'bg-yellow-500/10 border-yellow-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'SUCCESS': return 'Ukończono';
      case 'FAILED': return 'Błąd';
      case 'RUNNING': return 'W trakcie';
      case 'PENDING': return 'Oczekuje';
      default: return status;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'FAILED': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'RUNNING': return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'PENDING': return <Clock className="w-5 h-5 text-yellow-400" />;
      default: return null;
    }
  }

  // Parse changedSkus as product changes
  function parseChangedProducts(log: SyncLog): ChangedProduct[] {
    if (!log.changedSkus || !Array.isArray(log.changedSkus)) return [];
    // Check if it's product changes format (has 'changes' array)
    if (log.changedSkus.length > 0 && 'changes' in log.changedSkus[0]) {
      return log.changedSkus as ChangedProduct[];
    }
    return [];
  }

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const isConfigured = status?.configured ?? false;
  const lastProductSync = productUpdateLogs[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-7 h-7 text-blue-400" />
              Aktualizacja produktów
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Zaktualizuj zaimportowane produkty danymi z Baselinkera
            </p>
          </div>
        </div>
      </div>

      {/* Not configured warning */}
      {!isConfigured && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-200 font-medium">Baselinker nie skonfigurowany</p>
            <p className="text-yellow-200/70 text-sm mt-1">
              Aby aktualizować produkty, najpierw skonfiguruj integrację z Baselinkerem.
            </p>
            <Link
              href="/baselinker"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Przejdź do konfiguracji &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main action card */}
      {isConfigured && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Zaktualizuj zaimportowane produkty
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                System porówna dane produktów z Baselinkera z danymi w sklepie i zaktualizuje
                produkty, w których zaszły zmiany (nazwa, cena, opis, kategoria, obrazy, warianty).
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Tylko istniejące produkty
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {lastProductSync
                    ? `Ostatnia: ${formatDate(lastProductSync.startedAt)}`
                    : 'Nie synchronizowano jeszcze'}
                </span>
              </div>
            </div>

            <button
              onClick={handleUpdateProducts}
              disabled={syncing}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all
                ${syncing
                  ? 'bg-blue-500/20 text-blue-300 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30'
                }
              `}
            >
              {syncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Aktualizowanie...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Zaktualizuj produkty
                </>
              )}
            </button>
          </div>

          {/* Progress indicator during sync */}
          {syncing && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Pobieranie i porównywanie danych...
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-200 font-medium">Błąd aktualizacji</p>
            <p className="text-red-200/70 text-sm mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-green-200 font-medium">Aktualizacja zakończona</p>
            <p className="text-green-200/70 text-sm mt-1">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Last sync result details */}
      {lastSyncResult && (
        <div className={`border rounded-xl p-5 ${getStatusBg(lastSyncResult.status)}`}>
          <div className="flex items-center gap-3 mb-4">
            {getStatusIcon(lastSyncResult.status)}
            <h3 className="text-white font-medium">Wynik ostatniej aktualizacji</h3>
            <span className="text-xs text-gray-400">
              {formatDate(lastSyncResult.startedAt)} &bull; {formatDuration(lastSyncResult.startedAt, lastSyncResult.completedAt)}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{lastSyncResult.itemsProcessed}</p>
              <p className="text-xs text-gray-400 mt-1">Przetworzono</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{lastSyncResult.itemsChanged || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Zmieniono</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {lastSyncResult.itemsProcessed - (lastSyncResult.itemsChanged || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Bez zmian</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{lastSyncResult.errors?.length || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Błędów</p>
            </div>
          </div>

          {/* Changed products details */}
          {(() => {
            const changedProds = parseChangedProducts(lastSyncResult);
            if (changedProds.length === 0) return null;

            return (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Zmienione produkty ({changedProds.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {changedProds.map((prod, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-white font-medium truncate">{prod.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">SKU: {prod.sku}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {prod.changes.map((change, ci) => (
                          <span
                            key={ci}
                            className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded"
                          >
                            {change.startsWith('Cena:') && <DollarSign className="w-3 h-3" />}
                            {change.startsWith('Nazwa:') && <Tag className="w-3 h-3" />}
                            {change}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Errors */}
          {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-300 mb-2">Błędy:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {lastSyncResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-300/70 bg-red-500/5 px-2 py-1 rounded">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync History */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Historia aktualizacji produktów
        </h3>

        {productUpdateLogs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Brak historii aktualizacji produktów
          </p>
        ) : (
          <div className="space-y-2">
            {productUpdateLogs.map((log) => {
              const isExpanded = expandedLog === log.id;
              const changedProds = parseChangedProducts(log);

              return (
                <div
                  key={log.id}
                  className={`border rounded-lg transition-colors ${getStatusBg(log.status)}`}
                >
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                          {getStatusLabel(log.status)}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {formatDate(log.startedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Przetworzono: {log.itemsProcessed}</span>
                        {(log.itemsChanged || 0) > 0 && (
                          <span className="text-blue-400">Zmieniono: {log.itemsChanged}</span>
                        )}
                        {log.completedAt && (
                          <span>{formatDuration(log.startedAt, log.completedAt)}</span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-white/5 space-y-3">
                      {/* Changed products */}
                      {changedProds.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-gray-300 mb-2">
                            Zmienione produkty ({changedProds.length}):
                          </h4>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {changedProds.map((prod, idx) => (
                              <div key={idx} className="bg-white/5 rounded p-2 text-xs">
                                <span className="text-white font-medium">{prod.name}</span>
                                <span className="text-gray-500 ml-2">({prod.sku})</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {prod.changes.map((change, ci) => (
                                    <span
                                      key={ci}
                                      className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded"
                                    >
                                      {change}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Errors */}
                      {log.errors && log.errors.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-red-300 mb-1">Błędy:</h4>
                          {log.errors.map((err, i) => (
                            <p key={i} className="text-xs text-red-300/70">{err}</p>
                          ))}
                        </div>
                      )}

                      {changedProds.length === 0 && (!log.errors || log.errors.length === 0) && (
                        <p className="text-xs text-gray-500 mt-3">Brak szczegółów do wyświetlenia</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
        <h4 className="text-sm font-medium text-blue-300 flex items-center gap-2 mb-2">
          <Info className="w-4 h-4" />
          Jak działa aktualizacja?
        </h4>
        <ul className="text-xs text-blue-200/60 space-y-1.5 list-disc list-inside">
          <li>System pobiera listę produktów z Baselinkera</li>
          <li>Porównuje je z istniejącymi produktami w sklepie</li>
          <li>Aktualizuje tylko produkty, w których zaszły zmiany (nazwa, cena, opis, kategoria, obrazy, warianty)</li>
          <li>Po aktualizacji produktów automatycznie synchronizowane są stany magazynowe</li>
          <li>Zmiany cenowe są rejestrowane w historii cen (zgodność z Omnibus)</li>
          <li>Nowe produkty nie są importowane — do tego użyj pełnej synchronizacji w panelu Baselinker</li>
        </ul>
      </div>
    </div>
  );
}
