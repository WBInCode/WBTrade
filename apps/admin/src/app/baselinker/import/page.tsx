'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  Package,
  Play,
  Square,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Loader2,
  Terminal,
  Shield,
  ChevronDown,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// ============================================
// Types
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ProgressEvent {
  syncLogId: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'progress' | 'phase' | 'complete' | 'aborted';
  message: string;
  phase?: string;
  current?: number;
  total?: number;
  percent?: number;
  productName?: string;
  sku?: string;
  mode?: string;
}

interface SyncStats {
  processed: number;
  total: number;
  warnings: number;
  errors: number;
  percent: number;
  phase: string;
  startedAt: Date | null;
}

type SyncMode = 'update-only' | 'new-only';
type SyncState = 'idle' | 'running' | 'completed' | 'error' | 'aborted';

// ============================================
// Helpers
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(start: Date): string {
  const diff = Math.floor((Date.now() - start.getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    init: 'Inicjalizacja',
    categories: 'Kategorie',
    products: 'Produkty',
    stock: 'Stany magazynowe',
    images: 'Obrazy',
    reindex: 'Wyszukiwarka',
  };
  return labels[phase] || phase;
}

// ============================================
// Components
// ============================================

function TerminalLine({ event }: { event: ProgressEvent }) {
  const colors: Record<string, string> = {
    info: 'text-gray-300',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    success: 'text-green-400',
    progress: 'text-blue-400',
    phase: 'text-cyan-400 font-semibold',
    complete: 'text-green-400 font-bold',
    aborted: 'text-orange-400 font-bold',
  };

  const icons: Record<string, string> = {
    info: '›',
    warning: '⚠',
    error: '✗',
    success: '✓',
    progress: '⟳',
    phase: '▸',
    complete: '★',
    aborted: '■',
  };

  const time = new Date(event.timestamp).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={`flex gap-2 text-xs font-mono leading-relaxed ${colors[event.type] || 'text-gray-400'}`}>
      <span className="text-gray-600 select-none shrink-0">{time}</span>
      <span className="select-none shrink-0">{icons[event.type] || '·'}</span>
      <span className="break-all">{event.message}</span>
    </div>
  );
}

function ProgressBar({ percent, phase }: { percent: number; phase: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{phaseLabel(phase)}</span>
        <span className="text-white font-medium">{Math.min(percent, 100)}%</span>
      </div>
      <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatsCards({ stats, state }: { stats: SyncStats; state: SyncState }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-white">{stats.processed}</p>
        <p className="text-xs text-gray-400">Przetworzonych</p>
      </div>
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-white">{stats.total}</p>
        <p className="text-xs text-gray-400">Do przetworzenia</p>
      </div>
      <div className="bg-gray-900/50 border border-yellow-500/20 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-yellow-400">{stats.warnings}</p>
        <p className="text-xs text-gray-400">Ostrzeżenia</p>
      </div>
      <div className="bg-gray-900/50 border border-red-500/20 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
        <p className="text-xs text-gray-400">Błędy</p>
      </div>
    </div>
  );
}

// ============================================
// Abort Confirmation Dialog
// ============================================

function AbortDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-red-500/50 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-full">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Przerwanie synchronizacji</h3>
        </div>
        <p className="text-gray-300 mb-2">
          Czy na pewno chcesz <span className="text-red-400 font-semibold">awaryjnie przerwać</span> trwającą synchronizację?
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Produkty przetworzone do tego momentu zostaną zachowane. Synchronizacja zostanie oznaczona jako przerwana.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4" />
            Przerwij synchronizację
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Page
// ============================================

export default function BaselinkerImportPage() {
  const { token } = useAuth();

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMode, setSyncMode] = useState<SyncMode | null>(null);
  const [syncLogId, setSyncLogId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [stats, setStats] = useState<SyncStats>({
    processed: 0,
    total: 0,
    warnings: 0,
    errors: 0,
    percent: 0,
    phase: '',
    startedAt: null,
  });

  // UI state
  const [showAbortDialog, setShowAbortDialog] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const syncStateRef = useRef<SyncState>('idle');

  // Keep ref in sync with state
  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);

  // ============================================
  // Timer
  // ============================================
  useEffect(() => {
    if (syncState !== 'running' || !stats.startedAt) return;
    const interval = setInterval(() => {
      setElapsedTime(formatDuration(stats.startedAt!));
    }, 1000);
    return () => clearInterval(interval);
  }, [syncState, stats.startedAt]);

  // ============================================
  // Auto-scroll terminal
  // ============================================
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // ============================================
  // SSE connection
  // ============================================
  const connectSSE = useCallback(
    (logId: string) => {
      if (!token) return;

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `${API_URL}/admin/baselinker/sync/progress/${logId}?token=${token}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (msg) => {
        try {
          const event: ProgressEvent = JSON.parse(msg.data);

          // Detect sync mode from init event
          if (event.mode) {
            setSyncMode(event.mode as SyncMode);
          }

          setEvents((prev) => {
            const next = [...prev, event];
            // Keep last 2000 events in UI
            return next.length > 2000 ? next.slice(-2000) : next;
          });

          // Update stats based on event type
          setStats((prev) => {
            const next = { ...prev };

            if (event.type === 'warning') next.warnings++;
            if (event.type === 'error') next.errors++;
            if (event.current !== undefined) next.processed = event.current;
            if (event.total !== undefined) next.total = event.total;
            if (event.percent !== undefined) next.percent = event.percent;
            if (event.phase) next.phase = event.phase;

            return next;
          });

          // Handle terminal states
          if (event.type === 'complete') {
            setSyncState('completed');
          } else if (event.type === 'aborted') {
            if (event.message.includes('Przerwanie synchronizacji żądane')) {
              // Just the abort request, not final yet
            } else {
              setSyncState('aborted');
            }
          } else if (event.type === 'error' && event.message.startsWith('Błąd synchronizacji:')) {
            setSyncState('error');
          }
        } catch {
          // Ignore parse errors (e.g. heartbeat)
        }
      };

      es.onerror = () => {
        // SSE connection error — use ref to avoid stale closure
        if (syncStateRef.current === 'running') {
          // Try to reconnect after a delay
          setTimeout(() => {
            if (eventSourceRef.current === es) {
              connectSSE(logId);
            }
          }, 3000);
        }
      };
    },
    [token]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // ============================================
  // Check for running sync on page load (reconnect after refresh)
  // ============================================
  useEffect(() => {
    if (!token) return;

    const checkRunningSync = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/baselinker/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (
          data.currentSync &&
          data.currentSync.status === 'RUNNING' &&
          data.currentSync.type === 'PRODUCTS'
        ) {
          const logId = data.currentSync.id;
          setSyncLogId(logId);
          setSyncState('running');
          setStats((prev) => ({
            ...prev,
            startedAt: new Date(data.currentSync.startedAt),
            phase: 'init',
          }));
          connectSSE(logId);
        }
      } catch (err) {
        console.error('Failed to check running sync:', err);
      }
    };

    checkRunningSync();
  }, [token, connectSSE]);

  // ============================================
  // Start sync
  // ============================================
  const startSync = async (mode: SyncMode) => {
    if (!token) return;

    setSyncMode(mode);
    setSyncState('running');
    setEvents([]);
    setStats({
      processed: 0,
      total: 0,
      warnings: 0,
      errors: 0,
      percent: 0,
      phase: 'init',
      startedAt: new Date(),
    });
    setElapsedTime('0s');

    try {
      const res = await fetch(`${API_URL}/admin/baselinker/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'products', mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Nie udało się uruchomić synchronizacji');
      }

      setSyncLogId(data.syncLogId);
      connectSSE(data.syncLogId);
    } catch (err) {
      setSyncState('error');
      setEvents((prev) => [
        ...prev,
        {
          syncLogId: '',
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Nie udało się uruchomić: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      ]);
    }
  };

  // ============================================
  // Abort sync
  // ============================================
  const handleAbort = async () => {
    if (!token || !syncLogId) return;

    setAborting(true);
    setShowAbortDialog(false);

    try {
      await fetch(`${API_URL}/admin/baselinker/sync/${syncLogId}/abort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Even if API call fails, the UI will show aborting state
    } finally {
      setAborting(false);
    }
  };

  // ============================================
  // Reset for new sync
  // ============================================
  const resetSync = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setSyncState('idle');
    setSyncMode(null);
    setSyncLogId(null);
    setEvents([]);
    setStats({
      processed: 0,
      total: 0,
      warnings: 0,
      errors: 0,
      percent: 0,
      phase: '',
      startedAt: null,
    });
    setElapsedTime('');
  };

  // ============================================
  // Filtered events for display
  // ============================================
  const displayEvents = showOnlyIssues
    ? events.filter((e) => e.type === 'warning' || e.type === 'error')
    : events;

  // ============================================
  // Status badge
  // ============================================
  const statusConfig: Record<SyncState, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'Gotowy', color: 'text-gray-400', icon: null },
    running: {
      label: 'W trakcie...',
      color: 'text-blue-400',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    completed: {
      label: 'Zakończony',
      color: 'text-green-400',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    error: {
      label: 'Błąd',
      color: 'text-red-400',
      icon: <XCircle className="w-4 h-4" />,
    },
    aborted: {
      label: 'Przerwany',
      color: 'text-orange-400',
      icon: <Square className="w-4 h-4" />,
    },
  };

  const currentStatus = statusConfig[syncState];

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/baselinker"
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Import produktów z Baselinker</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Zarządzaj importem i aktualizacją produktów
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 ${currentStatus.color}`}>
          {currentStatus.icon}
          <span className="text-sm font-medium">{currentStatus.label}</span>
          {syncState === 'running' && elapsedTime && (
            <span className="text-xs text-gray-500 ml-1">({elapsedTime})</span>
          )}
        </div>
      </div>

      {/* Action Buttons — shown only when idle */}
      {syncState === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Update existing */}
          <button
            onClick={() => startSync('update-only')}
            className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl p-6 text-left transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                <RefreshCw className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Aktualizuj istniejące produkty
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Zaktualizuj nazwy, ceny, opisy i stany magazynowe wcześniej zaimportowanych produktów.
                </p>
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <Play className="w-4 h-4" />
                  Rozpocznij aktualizację
                </div>
              </div>
            </div>
          </button>

          {/* Import new */}
          <button
            onClick={() => startSync('new-only')}
            className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-green-500/50 rounded-xl p-6 text-left transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl group-hover:bg-green-500/30 transition-colors">
                <Download className="w-7 h-7 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Dodaj nowe produkty
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Pobierz tylko nowe produkty z Baselinker (bez aktualizacji istniejących, bez stanów 0).
                </p>
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <Play className="w-4 h-4" />
                  Rozpocznij import
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Active sync info bar */}
      {syncState !== 'idle' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  syncMode === 'update-only' ? 'bg-blue-500/20' : 'bg-green-500/20'
                }`}
              >
                {syncMode === 'update-only' ? (
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                ) : (
                  <Download className="w-5 h-5 text-green-400" />
                )}
              </div>
              <div>
                <h3 className="text-white font-medium">
                  {syncMode === 'update-only'
                    ? 'Aktualizacja istniejących produktów'
                    : 'Import nowych produktów'}
                </h3>
                {stats.startedAt && (
                  <p className="text-xs text-gray-500">
                    Start: {formatTime(stats.startedAt)}
                    {elapsedTime && ` · Czas: ${elapsedTime}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Reset button — shown only when sync is done */}
              {syncState !== 'running' && (
                <button
                  onClick={resetSync}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nowa operacja
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {syncState === 'running' && stats.phase && (
            <ProgressBar percent={stats.percent} phase={stats.phase} />
          )}

          {/* Stats */}
          <div className="mt-3">
            <StatsCards stats={stats} state={syncState} />
          </div>
        </div>
      )}

      {/* Terminal + sidebar */}
      {syncState !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Terminal */}
          <div className="lg:col-span-3 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Konsola synchronizacji</span>
                <span className="text-xs text-gray-600 ml-2">{events.length} wpisów</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyIssues}
                    onChange={(e) => setShowOnlyIssues(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500/30 w-3.5 h-3.5"
                  />
                  Tylko problemy
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5"
                  />
                  Auto-scroll
                </label>
              </div>
            </div>

            {/* Terminal body */}
            <div
              ref={terminalRef}
              className="p-3 h-[400px] overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            >
              {displayEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                  {syncState === 'running' ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Oczekiwanie na dane...
                    </div>
                  ) : (
                    'Brak wpisów'
                  )}
                </div>
              ) : (
                displayEvents.map((event, idx) => <TerminalLine key={idx} event={event} />)
              )}
            </div>
          </div>

          {/* Sidebar — warnings/errors summary */}
          <div className="space-y-4">
            {/* Issues panel */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Alerty ({stats.warnings + stats.errors})
              </h3>
              <div className="max-h-[340px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
                {events
                  .filter((e) => e.type === 'warning' || e.type === 'error')
                  .slice(-50)
                  .map((event, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded-lg border ${
                        event.type === 'error'
                          ? 'bg-red-500/10 border-red-500/20 text-red-300'
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        {event.type === 'error' ? (
                          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        )}
                        <span className="break-all">{event.message}</span>
                      </div>
                      {event.sku && (
                        <span className="text-[10px] text-gray-500 mt-1 block">SKU: {event.sku}</span>
                      )}
                    </div>
                  ))}

                {stats.warnings + stats.errors === 0 && (
                  <div className="text-center text-gray-600 text-xs py-4">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-gray-700" />
                    Brak problemów
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <p>Synchronizacja działa w tle na serwerze.</p>
                  <p className="mt-1">Możesz opuścić tę stronę — proces będzie kontynuowany.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Abort Button — always visible during running */}
      {syncState === 'running' && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAbortDialog(true)}
            disabled={aborting}
            className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border-2 border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 disabled:opacity-50"
          >
            {aborting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Przerywanie...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Awaryjne przerwanie synchronizacji
              </>
            )}
          </button>
        </div>
      )}

      {/* Abort confirmation dialog */}
      <AbortDialog
        open={showAbortDialog}
        onConfirm={handleAbort}
        onCancel={() => setShowAbortDialog(false)}
      />
    </div>
  );
}
