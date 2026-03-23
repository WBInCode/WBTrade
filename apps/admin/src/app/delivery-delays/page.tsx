'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getAuthToken } from '@/lib/api';
import { useToast } from '@/lib/toast';
import {
  Clock,
  AlertTriangle,
  Send,
  X,
  CheckCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Package,
  Mail,
  Bell,
  Eye,
  XCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface DelayAlert {
  id: string;
  status: string;
  detectedAt: string;
  notifiedAt: string | null;
  messageType: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    estimatedDeliveryDate: string | null;
    shippingMethod: string;
    total: number;
    createdAt: string;
    userId: string | null;
    guestEmail: string | null;
    guestFirstName: string | null;
    guestLastName: string | null;
    user: { firstName: string; lastName: string; email: string } | null;
    items: { productName: string; quantity: number }[];
  };
}

interface Preset {
  id: string;
  name: string;
  description: string;
  content: string;
}

type FilterStatus = 'all' | 'pending' | 'notified' | 'dismissed';

export default function DeliveryDelaysPage() {
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [alertHours, setAlertHours] = useState(24);
  const [savingSettings, setSavingSettings] = useState(false);

  // Notify modal
  const [selectedAlert, setSelectedAlert] = useState<DelayAlert | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('preset_1');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState<string | null>(null);

  const { success, error: toastError } = useToast();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(
        `${API_URL}/admin/delivery-delays?status=${filterStatus}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
        setPendingCount(data.pendingCount);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  const fetchSettings = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/admin/delivery-delays/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlertHours(data.alertHours);
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const fetchPresets = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/admin/delivery-delays/presets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets);
      }
    } catch (e) {
      console.error('Failed to fetch presets:', e);
    }
  };

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => { fetchSettings(); fetchPresets(); }, []);

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/admin/delivery-delays/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertHours }),
      });
      if (res.ok) {
        success('Ustawienia zapisane', `Próg alertu: ${alertHours}h`);
      } else {
        toastError('Błąd', 'Nie udało się zapisać ustawień');
      }
    } catch (e) {
      toastError('Błąd', 'Nie udało się zapisać ustawień');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleNotify = async () => {
    if (!selectedAlert) return;
    try {
      setSending(true);
      const token = getAuthToken();
      const body: any = { messageType: selectedPreset };
      if (selectedPreset === 'custom') {
        body.customMessage = customMessage;
      }
      const res = await fetch(`${API_URL}/admin/delivery-delays/${selectedAlert.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        success('Powiadomienie wysłane', `Zamówienie #${selectedAlert.order.orderNumber}`);
        setSelectedAlert(null);
        fetchAlerts();
      } else {
        toastError('Błąd', data.message || 'Nie udało się wysłać');
      }
    } catch (e) {
      toastError('Błąd', 'Nie udało się wysłać powiadomienia');
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/admin/delivery-delays/${alertId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        success('Alert odrzucony');
        fetchAlerts();
      }
    } catch (e) {
      toastError('Błąd', 'Nie udało się odrzucić alertu');
    }
  };

  const handleManualDetect = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/admin/delivery-delays/detect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        success('Wykrywanie zakończone', `Nowe alerty: ${data.detected}, pominięte: ${data.skipped}`);
        fetchAlerts();
      }
    } catch (e) {
      toastError('Błąd', 'Nie udało się uruchomić wykrywania');
    }
  };

  const getCustomerName = (order: DelayAlert['order']) => {
    if (order.user) return `${order.user.firstName} ${order.user.lastName}`;
    return `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || 'Gość';
  };

  const getCustomerEmail = (order: DelayAlert['order']) => {
    return order.user?.email || order.guestEmail || '—';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Oczekuje</span>;
      case 'notified': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Powiadomiony</span>;
      case 'dismissed': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">Odrzucony</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">{status}</span>;
    }
  };

  const getPresetContent = (presetId: string, orderNumber: string) => {
    if (presetId === 'custom') return customMessage;
    const preset = presets.find((p) => p.id === presetId);
    return preset?.content.replace(/\{orderNumber\}/g, orderNumber) || '';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Opóźnienia dostaw</h1>
            <p className="text-sm text-slate-400">
              {pendingCount > 0
                ? `${pendingCount} alert${pendingCount === 1 ? '' : 'ów'} oczekuje na reakcję`
                : 'Brak oczekujących alertów'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualDetect}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Wykryj teraz
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Ustawienia
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Konfiguracja progu alertu
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            System wygeneruje alert na określoną liczbę godzin przed planowaną datą dostawy, jeśli paczka nie została wysłana.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={alertHours}
              onChange={(e) => setAlertHours(Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="6">6 godzin</option>
              <option value="12">12 godzin</option>
              <option value="24">24 godziny (1 dzień)</option>
              <option value="48">48 godzin (2 dni)</option>
              <option value="72">72 godziny (3 dni)</option>
            </select>
            <span className="text-sm text-slate-400">przed planowaną datą dostawy</span>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="ml-auto px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {savingSettings ? 'Zapisuję...' : 'Zapisz'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {(['pending', 'notified', 'dismissed', 'all'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {s === 'pending' && 'Oczekujące'}
            {s === 'notified' && 'Powiadomione'}
            {s === 'dismissed' && 'Odrzucone'}
            {s === 'all' && 'Wszystkie'}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-orange-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Ładowanie...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-white font-medium">Brak alertów</p>
          <p className="text-sm text-slate-400 mt-1">Wszystkie dostawy na czas</p>
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Zamówienie</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Klient</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Planowana dostawa</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status zamówienia</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status alertu</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Wykryto</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">#{alert.order.orderNumber}</div>
                    <div className="text-xs text-slate-400">{Number(alert.order.total).toFixed(2)} zł</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{getCustomerName(alert.order)}</div>
                    <div className="text-xs text-slate-400">{getCustomerEmail(alert.order)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{formatDate(alert.order.estimatedDeliveryDate)}</div>
                    <div className="text-xs text-slate-400">{alert.order.shippingMethod}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                      {alert.order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(alert.status)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(alert.detectedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {alert.status === 'pending' && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setSelectedAlert(alert); setSelectedPreset('preset_1'); setCustomMessage(''); }}
                          className="p-1.5 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors"
                          title="Wyślij powiadomienie"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 transition-colors"
                          title="Odrzuć alert"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {alert.status === 'notified' && (
                      <span className="text-xs text-green-400">Wysłano {formatDate(alert.notifiedAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-700">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-sm text-slate-400 hover:text-white disabled:opacity-30"
              >
                ← Poprzednia
              </button>
              <span className="text-sm text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm text-slate-400 hover:text-white disabled:opacity-30"
              >
                Następna →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notify Modal — rendered via portal to bypass .page-enter transform */}
      {selectedAlert && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => setSelectedAlert(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl relative flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Sticky close button */}
            <button
              onClick={() => setSelectedAlert(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 min-h-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Wyślij powiadomienie</h2>
                  <p className="text-sm text-slate-400">Zamówienie #{selectedAlert.order.orderNumber}</p>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Klient:</span>{' '}
                  <span className="text-white">{getCustomerName(selectedAlert.order)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <span className="text-white">{getCustomerEmail(selectedAlert.order)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Planowana dostawa:</span>{' '}
                  <span className="text-white">{formatDate(selectedAlert.order.estimatedDeliveryDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Wysyłka:</span>{' '}
                  <span className="text-white">{selectedAlert.order.shippingMethod}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Produkty:</span>{' '}
                  <span className="text-white">
                    {selectedAlert.order.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Preset Selection */}
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-white mb-3">Wybierz treść wiadomości</h3>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <label
                    key={preset.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedPreset === preset.id
                        ? 'border-orange-500/50 bg-orange-500/5'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preset"
                      value={preset.id}
                      checked={selectedPreset === preset.id}
                      onChange={() => setSelectedPreset(preset.id)}
                      className="mt-0.5 accent-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{preset.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{preset.description}</div>
                      {/* Preview toggle */}
                      <button
                        onClick={(e) => { e.preventDefault(); setPreviewExpanded(previewExpanded === preset.id ? null : preset.id); }}
                        className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-1"
                      >
                        <Eye className="w-3 h-3" />
                        {previewExpanded === preset.id ? 'Ukryj podgląd' : 'Podgląd'}
                        {previewExpanded === preset.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {previewExpanded === preset.id && (
                        <div className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-slate-300 whitespace-pre-wrap border border-slate-700">
                          {getPresetContent(preset.id, selectedAlert.order.orderNumber)}
                        </div>
                      )}
                    </div>
                  </label>
                ))}

                {/* Custom message option */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPreset === 'custom'
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value="custom"
                    checked={selectedPreset === 'custom'}
                    onChange={() => setSelectedPreset('custom')}
                    className="mt-0.5 accent-orange-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">Własna wiadomość</div>
                    <div className="text-xs text-slate-400 mt-0.5">Wpisz własną treść powiadomienia</div>
                  </div>
                </label>

                {selectedPreset === 'custom' && (
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Wpisz treść wiadomości dla klienta..."
                    rows={6}
                    className="w-full mt-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                )}
              </div>

              {/* Info about notification channels */}
              <div className="flex items-start gap-2 mt-4 p-3 bg-slate-700/30 rounded-lg">
                <Bell className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-3 h-3" />
                    <span>Email zostanie wysłany na adres: <strong className="text-slate-300">{getCustomerEmail(selectedAlert.order)}</strong></span>
                  </div>
                  {selectedAlert.order.userId && (
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      <span>Powiadomienie in-app pojawi się w panelu klienta</span>
                    </div>
                  )}
                  {!selectedAlert.order.userId && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Package className="w-3 h-3" />
                      <span>Zamówienie gościa — tylko email (brak konta)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>{/* end scrollable content */}

            {/* Footer - always visible at bottom */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 shrink-0">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
              >
                Zamknij
              </button>
              <button
                onClick={() => handleDismiss(selectedAlert.id).then(() => setSelectedAlert(null))}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
              >
                Odrzuć alert
              </button>
              <button
                onClick={handleNotify}
                disabled={sending || (selectedPreset === 'custom' && !customMessage.trim())}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Wysyłam...' : 'Wyślij powiadomienie'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
