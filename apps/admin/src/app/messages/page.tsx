'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Search, Filter, ChevronLeft, ChevronRight,
  Inbox, Clock, CheckCircle, AlertCircle, RefreshCw, Eye
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
  subject: string;
  category: string;
  status: string;
  priority: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
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
  ORDER: 'Zamówienie',
  DELIVERY: 'Dostawa',
  COMPLAINT: 'Reklamacja',
  PAYMENT: 'Płatność',
  ACCOUNT: 'Konto',
  GENERAL: 'Ogólne',
};

const categoryColors: Record<string, string> = {
  ORDER: 'bg-blue-500/20 text-blue-400',
  DELIVERY: 'bg-cyan-500/20 text-cyan-400',
  COMPLAINT: 'bg-red-500/20 text-red-400',
  PAYMENT: 'bg-purple-500/20 text-purple-400',
  ACCOUNT: 'bg-orange-500/20 text-orange-400',
  GENERAL: 'bg-slate-500/20 text-slate-400',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Niski',
  NORMAL: 'Normalny',
  HIGH: 'Wysoki',
};

export default function MessagesPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/admin/support/stats`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // ─── Auto-polling every 15s for live updates ───
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
      loadTickets();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadStats, loadTickets]);

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
    return ticket.guestEmail || 'Gość';
  };

  const getCustomerEmail = (ticket: Ticket) => {
    return ticket.user?.email || ticket.guestEmail || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <MessageSquare className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Wiadomości</h1>
            <p className="text-sm text-gray-400">Zarządzaj zgłoszeniami klientów</p>
          </div>
        </div>
        <button
          onClick={() => { loadStats(); loadTickets(); }}
          className="px-4 py-2 bg-slate-800 rounded-lg text-gray-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Odśwież
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Inbox className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400 uppercase">Otwarte</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.open}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400 uppercase">W trakcie</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400 uppercase">Zamknięte dziś</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.closedToday}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 uppercase">Wszystkie</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-400 uppercase">Nieprzeczytane</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.unreadMessages}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj po numerze, temacie, kliencie..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Wszystkie statusy</option>
            <option value="OPEN">Otwarte</option>
            <option value="IN_PROGRESS">W trakcie</option>
            <option value="CLOSED">Zamknięte</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Wszystkie kategorie</option>
            <option value="ORDER">Zamówienie</option>
            <option value="DELIVERY">Dostawa</option>
            <option value="COMPLAINT">Reklamacja</option>
            <option value="PAYMENT">Płatność</option>
            <option value="ACCOUNT">Konto</option>
            <option value="GENERAL">Ogólne</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-800/80">
                <th className="px-4 py-4">Numer</th>
                <th className="px-4 py-4">Klient</th>
                <th className="px-4 py-4">Temat</th>
                <th className="px-4 py-4">Kategoria</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Zamówienie</th>
                <th className="px-4 py-4">Ostatnia wiadomość</th>
                <th className="px-4 py-4">Data</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-14 bg-slate-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Brak zgłoszeń</p>
                    <p className="text-sm mt-1">Nie znaleziono zgłoszeń spełniających kryteria</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-slate-700/30 transition-colors ${ticket.unreadCount > 0 ? 'bg-orange-500/5' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {ticket.unreadCount > 0 && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        )}
                        <span className="text-white font-mono text-sm">{ticket.ticketNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm font-medium">{getCustomerName(ticket)}</p>
                      <p className="text-gray-400 text-xs">{getCustomerEmail(ticket)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm max-w-xs truncate">{ticket.subject}</p>
                      {ticket.lastMessage && (
                        <p className="text-gray-500 text-xs mt-1 max-w-xs truncate">
                          {ticket.lastMessage.senderRole === 'ADMIN' ? 'Ty: ' : ''}
                          {ticket.lastMessage.content}
                        </p>
                      )}
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
                        <Link
                          href={`/orders/${ticket.order.id}`}
                          className="text-orange-400 text-sm hover:text-orange-300"
                        >
                          {ticket.order.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(ticket.lastMessageAt)}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/messages/${ticket.id}`}
                        className="p-2 text-gray-400 hover:text-orange-400 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
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
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
