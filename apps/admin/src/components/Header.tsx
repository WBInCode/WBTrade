'use client';

import { Bell, Search, Settings, Menu, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const [notifications] = useState([
    { id: 1, title: 'Nowe zamówienie #12345', time: '2 min temu', type: 'order' },
    { id: 2, title: 'Niski stan: iPhone 15 Pro', time: '15 min temu', type: 'stock' },
    { id: 3, title: 'Zwrot #11234 oczekuje', time: '1h temu', type: 'return' },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    WAREHOUSE: 'Magazynier',
    SUPPORT: 'Support',
  };

  return (
    <header className="h-16 bg-admin-sidebar border-b border-admin-border flex items-center justify-between px-6">
      {/* Left side - breadcrumb/title */}
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/30">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-slate-400">Przegląd sklepu i magazynu</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center bg-slate-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj produktów, zamówień..."
            className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 ml-2 w-64"
          />
          <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 bg-slate-700 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/30 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="font-medium text-white">Powiadomienia</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 last:border-0"
                  >
                    <p className="text-sm text-white">{notif.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-700">
                <button className="text-sm text-orange-400 hover:text-orange-300">
                  Zobacz wszystkie
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/30 transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/30 transition-colors"
            >
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400">{roleLabels[user.role] || user.role}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-sm font-medium text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => logout()}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700/50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj się
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
