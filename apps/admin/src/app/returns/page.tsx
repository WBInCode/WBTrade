'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RotateCcw, Search, ChevronLeft, ChevronRight,
  Inbox, Clock, CheckCircle, AlertCircle, RefreshCw, Eye,
  Archive, MoreHorizontal, X, CheckSquare, Square,
  FileWarning, Package,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const tokens = localStorage.getItem('admin_auth_tokens');
  if (!tokens) return null;
  try {
    return JSON.parse(tokens).accessToken;
  } catch {
    return null;
  }
}

interface Ticket {
  id: string;
  ticketNumber: string;
  returnNumber?: string | null;
  subject: string;
  category: string;
  status: string;
  priority: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  guestName?: string | null;
  guestPhone?: string | null;
  lastMessage?: {
    content: string;
    senderRole: string;
    createdAt: string;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  guestEmail?: string | null;
  order?: {
    id: string;
    orderNumber: string;
  } | null;
}

interface Stats {
  open: number;
  inProgress: number;
  closedToday: number;
  total: number;
  unreadMessages: number;
  archived: number;
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CLOSED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels: Record<string, string> = {
  OPEN: 'Otwarte',
  IN_PROGRESS: 'W trakcie',
  CLOSED: 'Zamknięte',
};

const categoryLabels: Record<string, string> = {
  RETURN: 'Zwrot',
  COMPLAINT: 'Reklamacja',
};

const categoryColors: Record<string, string> = {
  RETURN: 'bg-orange-500/20 text-orange-400',
  COMPLAINT: 'bg-red-500/20 text-red-400',
};

export default function ReturnsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Stats
  const [returnStats, setReturnStats] = useState<{
    totalReturns: number;
    totalComplaints: number;
    openReturns: number;
    openComplaints: number;
    inProgressCount: number;
    closedToday: number;
  } | null>(null);

  // Selection & actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [quickActionId, setQuickActionId] = useState<string | null>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/support/return-stats`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setReturnStats(data);
      }
    } catch (error) {
      console.error('Failed to load return stats:', error);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      // Build category filter — if user picked one specific, use that; else both
      const catParam = categoryFilter || 'RETURN,COMPLAINT';

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        category: catParam,
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`${API_URL}/admin/support/tickets?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, searchTerm]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
      loadTickets();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStats, loadTickets]);

  // Close quick action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setQuickActionId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerName = (ticket: Ticket) => {
    if (ticket.user) {
      return `${ticket.user.firstName} ${ticket.user.lastName}`;
    }
    if (ticket.guestName) return ticket.guestName;
    return ticket.guestEmail || 'Gość';
  };

  const getCustomerEmail = (ticket: Ticket) => {
    return ticket.user?.email || ticket.guestEmail || '';
  };

  // ─── Selection Helpers ───
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map(t => t.id)));
    }
  };

  // ─── Bulk Actions ───
  const apiCall = async (url: string, body: any) => {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const data = await apiCall('/admin/support/tickets/bulk-status', {
        ticketIds: Array.from(selectedIds), status,
      });
      showToast(data.message || `Zmieniono status ${selectedIds.size} zgłoszeń`);
      setSelectedIds(new Set());
      loadTickets(); loadStats();
    } catch { showToast('Błąd zmiany statusu', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const data = await apiCall('/admin/support/tickets/archive', {
        ticketIds: Array.from(selectedIds),
      });
      showToast(data.message || `Zarchiwizowano ${selectedIds.size} zgłoszeń`);
      setSelectedIds(new Set());
      loadTickets(); loadStats();
    } catch { showToast('Błąd archiwizacji', 'error'); }
    finally { setActionLoading(false); }
  };

  // ─── Quick Actions ───
  const handleQuickStatus = async (ticketId: string, status: string) => {
    setQuickActionId(null);
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/admin/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ status }),
      });
      showToast(`Status zmieniony na: ${statusLabels[status]}`);
      loadTickets(); loadStats();
    } catch { showToast('Błąd zmiany statusu', 'error'); }
  };

  const handleQuickArchive = async (ticketId: string) => {
    setQuickActionId(null);
    try {
      await apiCall('/admin/support/tickets/archive', { ticketIds: [ticketId] });
      showToast('Zgłoszenie zarchiwizowane');
      loadTickets(); loadStats();
    } catch { showToast('Błąd archiwizacji', 'error'); }
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-3 h-3" /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 rounded-xl">
            <RotateCcw className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Zwroty i reklamacje</h1>
            <p className="text-sm text-gray-400">Zarządzanie zwrotami i reklamacjami klientów</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadTickets(); loadStats(); }}
            className="p-2.5 bg-slate-800 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-all duration-200"
            title="Odśwież"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {returnStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-orange-500/30 transition-all duration-300 group cursor-pointer"
            onClick={() => { setCategoryFilter('RETURN'); setStatusFilter('OPEN'); setPage(1); }}>
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs text-gray-400 uppercase">Otwarte zwroty</span>
            </div>
            <p className="text-2xl font-bold text-white">{returnStats.openReturns}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-red-500/30 transition-all duration-300 group cursor-pointer"
            onClick={() => { setCategoryFilter('COMPLAINT'); setStatusFilter('OPEN'); setPage(1); }}>
            <div className="flex items-center gap-2 mb-2">
              <FileWarning className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs text-gray-400 uppercase">Otwarte reklamacje</span>
            </div>
            <p className="text-2xl font-bold text-white">{returnStats.openComplaints}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-yellow-500/30 transition-all duration-300 group cursor-pointer"
            onClick={() => { setCategoryFilter(''); setStatusFilter('IN_PROGRESS'); setPage(1); }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs text-gray-400 uppercase">W trakcie</span>
            </div>
            <p className="text-2xl font-bold text-white">{returnStats.inProgressCount}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-emerald-500/30 transition-all duration-300 group">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs text-gray-400 uppercase">Zamknięte dziś</span>
            </div>
            <p className="text-2xl font-bold text-white">{returnStats.closedToday}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-orange-500/30 transition-all duration-300 group cursor-pointer"
            onClick={() => { setCategoryFilter('RETURN'); setStatusFilter(''); setPage(1); }}>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs text-gray-400 uppercase">Wszystkie zwroty</span>
            </div>
            <p className="text-2xl font-bold text-white">{returnStats.totalReturns}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-red-500/30 transition-all duration-300 group cursor-pointer"
            onClick={() => { setCategoryFilter('COMPLAINT'); setStatusFilter(''); setPage(1); }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs text-gray-400 uppercase">Wszystkie reklamacje</span>
            </div>
            <p className="text-2xl font-bold text-white">{returnStats.totalComplaints}</p>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <div className={`overflow-hidden transition-all duration-300 ${hasSelection ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-orange-400" />
            <span className="text-sm text-orange-300 font-medium">
              Zaznaczono: {selectedIds.size} {selectedIds.size === 1 ? 'zgłoszenie' : selectedIds.size < 5 ? 'zgłoszenia' : 'zgłoszeń'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => handleBulkStatus('CLOSED')} disabled={actionLoading}
              className="px-3 py-1.5 bg-gray-600/50 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50">Zamknij</button>
            <button onClick={() => handleBulkStatus('IN_PROGRESS')} disabled={actionLoading}
              className="px-3 py-1.5 bg-yellow-600/50 hover:bg-yellow-600 text-yellow-300 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50">W trakcie</button>
            <button onClick={() => handleBulkStatus('OPEN')} disabled={actionLoading}
              className="px-3 py-1.5 bg-green-600/50 hover:bg-green-600 text-green-300 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50">Otwórz</button>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <button onClick={handleBulkArchive} disabled={actionLoading}
              className="px-3 py-1.5 bg-orange-600/50 hover:bg-orange-600 text-orange-300 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" /> Archiwizuj
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj po numerze zwrotu, temacie, kliencie..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow duration-200"
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow duration-200">
            <option value="">Wszystkie statusy</option>
            <option value="OPEN">Otwarte</option>
            <option value="IN_PROGRESS">W trakcie</option>
            <option value="CLOSED">Zamknięte</option>
          </select>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow duration-200">
            <option value="">Zwroty i reklamacje</option>
            <option value="RETURN">Tylko zwroty</option>
            <option value="COMPLAINT">Tylko reklamacje</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-800/80">
                <th className="px-4 py-4 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white transition-colors">
                    {selectedIds.size === tickets.length && tickets.length > 0
                      ? <CheckSquare className="w-4 h-4 text-orange-400" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-4 py-4">Nr zwrotu / rek.</th>
                <th className="px-4 py-4">Ticket</th>
                <th className="px-4 py-4">Klient</th>
                <th className="px-4 py-4">Temat</th>
                <th className="px-4 py-4">Typ</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Zamówienie</th>
                <th className="px-4 py-4">Data</th>
                <th className="px-4 py-4 w-20">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-14 bg-slate-700/50 rounded-lg"></div>
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Brak zgłoszeń</p>
                    <p className="text-sm mt-1">Nie znaleziono zwrotów ani reklamacji spełniających kryteria</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}
                    className={`group hover:bg-slate-700/30 transition-all duration-200 ${
                      ticket.unreadCount > 0 ? 'bg-orange-500/5' : ''
                    } ${selectedIds.has(ticket.id) ? 'bg-orange-500/10' : ''}`}>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleSelect(ticket.id)} className="text-gray-400 hover:text-orange-400 transition-colors">
                        {selectedIds.has(ticket.id) ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      {ticket.returnNumber ? (
                        <Link href={`/messages/${ticket.id}`} className="group/rn">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wide ${
                            ticket.category === 'RETURN'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          } group-hover/rn:brightness-125 transition-all`}>
                            {ticket.returnNumber}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/messages/${ticket.id}`} className="flex items-center gap-2 group/num">
                        {ticket.unreadCount > 0 && <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse" />}
                        <span className="text-white font-mono text-sm group-hover/num:text-orange-400 transition-colors">{ticket.ticketNumber}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm font-medium">{getCustomerName(ticket)}</p>
                      <p className="text-gray-400 text-xs">{getCustomerEmail(ticket)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/messages/${ticket.id}`} className="block group/link">
                        <p className="text-white text-sm max-w-xs truncate font-medium group-hover/link:text-orange-400 transition-colors cursor-pointer">{ticket.subject}</p>
                        {ticket.lastMessage && (
                          <p className="text-gray-500 text-xs mt-1 max-w-xs truncate">
                            {ticket.lastMessage.senderRole === 'ADMIN' ? 'Ty: ' : ''}{ticket.lastMessage.content}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${categoryColors[ticket.category] || 'bg-slate-500/20 text-slate-400'}`}>
                        {categoryLabels[ticket.category] || ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${statusColors[ticket.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                        {statusLabels[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {ticket.order ? (
                        <Link href={`/orders/${ticket.order.id}`} className="text-orange-400 text-sm hover:text-orange-300 transition-colors">
                          {ticket.order.orderNumber}
                        </Link>
                      ) : <span className="text-gray-500 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">{formatDate(ticket.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 relative">
                        <Link href={`/messages/${ticket.id}`}
                          className="p-2 text-gray-400 hover:text-orange-400 transition-all duration-200 hover:bg-slate-700/50 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setQuickActionId(quickActionId === ticket.id ? null : ticket.id)}
                          className="p-2 text-gray-400 hover:text-white transition-all duration-200 hover:bg-slate-700/50 rounded-lg">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Quick Action Menu */}
                        {quickActionId === ticket.id && (
                          <div ref={quickMenuRef}
                            className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 py-1">
                            <Link href={`/messages/${ticket.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                              <Eye className="w-4 h-4" /> Otwórz
                            </Link>
                            <div className="border-t border-slate-700 my-1" />
                            {ticket.status !== 'OPEN' && (
                              <button onClick={() => handleQuickStatus(ticket.id, 'OPEN')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 transition-colors">
                                <Inbox className="w-4 h-4" /> Oznacz jako otwarte
                              </button>
                            )}
                            {ticket.status !== 'IN_PROGRESS' && (
                              <button onClick={() => handleQuickStatus(ticket.id, 'IN_PROGRESS')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                                <Clock className="w-4 h-4" /> W trakcie
                              </button>
                            )}
                            {ticket.status !== 'CLOSED' && (
                              <button onClick={() => handleQuickStatus(ticket.id, 'CLOSED')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-slate-700/50 transition-colors">
                                <CheckCircle className="w-4 h-4" /> Zamknij
                              </button>
                            )}
                            <div className="border-t border-slate-700 my-1" />
                            <button onClick={() => handleQuickArchive(ticket.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors">
                              <Archive className="w-4 h-4" /> Archiwizuj
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Wyświetlanie {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} z {total} zgłoszeń
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
