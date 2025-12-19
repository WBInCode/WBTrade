'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

// Ścieżki bez layoutu (strona logowania)
const noLayoutPaths = ['/login', '/forgot-password'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

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
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          {children}
        </main>
      </div>
    </div>
  );
}
