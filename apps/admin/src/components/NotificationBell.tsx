'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ShoppingCart, AlertTriangle, UserPlus, PackageX, Star, ArrowLeft, X, CheckCheck, Eye } from 'lucide-react';
import { getAuthToken } from '@/lib/api';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const STORAGE_KEY = 'wbtrade_read_notifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface NotificationSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  byType: {
    cancellations: number;
    lowStock: number;
    newOrders: number;
    refunds: number;
    newUsers: number;
    reviews: number;
  };
}

const typeConfig: Record<string, { icon: any; color: string }> = {
  cancellation: { icon: AlertTriangle, color: 'text-red-400 bg-red-400/10' },
  low_stock: { icon: PackageX, color: 'text-yellow-400 bg-yellow-400/10' },
  refund: { icon: ArrowLeft, color: 'text-orange-400 bg-orange-400/10' },
  new_order: { icon: ShoppingCart, color: 'text-green-400 bg-green-400/10' },
  new_user: { icon: UserPlus, color: 'text-blue-400 bg-blue-400/10' },
  review: { icon: Star, color: 'text-purple-400 bg-purple-400/10' },
};

const priorityDot: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Teraz';
  if (mins < 60) return `${mins} min temu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h temu`;
  const days = Math.floor(hrs / 24);
  return `${days}d temu`;
}

// ── localStorage helpers for read state ──
function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: string[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read state from localStorage
  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/admin/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setSummary(data.summary);

        // Clean up old read IDs that no longer exist
        const currentIds = new Set(data.notifications.map((n: Notification) => n.id));
        const stored = getReadIds();
        const cleaned = new Set([...stored].filter((id) => currentIds.has(id)));
        if (cleaned.size !== stored.size) {
          saveReadIds(cleaned);
          setReadIds(cleaned);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + polling co 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch on open
  const toggleDropdown = () => {
    if (!isOpen) fetchNotifications();
    setIsOpen(!isOpen);
  };

  // Mark single as read
  const markAsRead = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      const next = new Set(readIds);
      next.add(id);
      setReadIds(next);
      saveReadIds(next);
    },
    [readIds]
  );

  // Mark ALL as read
  const markAllAsRead = useCallback(() => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveReadIds(next);
  }, [readIds, notifications]);

  // Unread count = notifications NOT in readIds
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/30 transition-colors"
        title="Powiadomienia"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div>
              <h3 className="font-semibold text-white text-sm">Powiadomienia</h3>
              {summary && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {unreadCount > 0 ? (
                    <>
                      <span className="text-orange-400 font-medium">{unreadCount} nieprzeczytanych</span>
                      <span> z {summary.total}</span>
                    </>
                  ) : (
                    <span>Wszystkie przeczytane ({summary.total})</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-slate-700/50 transition-colors"
                  title="Oznacz wszystkie jako przeczytane"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Przeczytane</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Summary chips */}
          {summary && summary.total > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-slate-700/50 bg-slate-800/50">
              {summary.byType.cancellations > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                  {summary.byType.cancellations} anulowań
                </span>
              )}
              {summary.byType.lowStock > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
                  {summary.byType.lowStock} niski stan
                </span>
              )}
              {summary.byType.newOrders > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                  {summary.byType.newOrders} nowych zam.
                </span>
              )}
              {summary.byType.refunds > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                  {summary.byType.refunds} zwrotów
                </span>
              )}
              {summary.byType.newUsers > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                  {summary.byType.newUsers} nowych użytk.
                </span>
              )}
              {summary.byType.reviews > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">
                  {summary.byType.reviews} recenzji
                </span>
              )}
            </div>
          )}

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[60vh] divide-y divide-slate-700/50">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-xs">Ładowanie...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Brak powiadomień</p>
                <p className="text-xs mt-1 opacity-60">Wszystko jest pod kontrolą!</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = typeConfig[notif.type] || { icon: Bell, color: 'text-slate-400 bg-slate-400/10' };
                const Icon = config.icon;
                const isRead = readIds.has(notif.id);

                return (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => {
                      markAsRead(notif.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors group relative ${
                      isRead ? 'opacity-50 bg-slate-800/30' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot[notif.priority]}`} />
                        )}
                        <p className={`text-xs font-medium truncate ${isRead ? 'text-slate-400' : 'text-white'}`}>{notif.title}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!isRead && (
                      <button
                        onClick={(e) => markAsRead(notif.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-green-400 p-1 rounded transition-all flex-shrink-0"
                        title="Oznacz jako przeczytane"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700 bg-slate-800/50">
              <button
                onClick={fetchNotifications}
                className="text-xs text-orange-400 hover:text-orange-300 py-1 transition-colors"
              >
                Odśwież
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-400 py-1 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Oznacz wszystkie
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
