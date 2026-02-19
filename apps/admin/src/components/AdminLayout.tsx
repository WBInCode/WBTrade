'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ToastContainer from '@/components/ToastContainer';
import CommandPalette from '@/components/CommandPalette';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

// Ścieżki bez layoutu (strona logowania)
const noLayoutPaths = ['/login', '/forgot-password'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isNoLayoutPath = noLayoutPaths.some(path => pathname.startsWith(path));

  // Loader podczas ładowania auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-admin-bg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Strona logowania - bez layoutu
  if (isNoLayoutPath) {
    return <>{children}</>;
  }

  // Brak zalogowanego użytkownika - AuthContext przekieruje
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-admin-bg">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // Normalny layout z sidebar i header
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-900/50">
          {children}
        </main>
      </div>
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}
