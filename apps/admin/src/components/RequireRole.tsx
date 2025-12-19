'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ShieldX } from 'lucide-react';
import { ReactNode } from 'react';

interface RequireRoleProps {
  children: ReactNode;
  roles: ('ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'SUPPORT')[];
  fallback?: ReactNode;
}

/**
 * RBAC Component - sprawdza czy użytkownik ma wymaganą rolę
 * 
 * Użycie:
 * <RequireRole roles={['ADMIN', 'MANAGER']}>
 *   <ComponentDostępnyDlaAdminaIManagera />
 * </RequireRole>
 */
export function RequireRole({ children, roles, fallback }: RequireRoleProps) {
  const { user, hasRole } = useAuth();

  if (!user || !hasRole(roles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Brak dostępu</h2>
        <p className="text-gray-400 max-w-md">
          Nie masz uprawnień do wyświetlenia tej strony. 
          Skontaktuj się z administratorem, aby uzyskać dostęp.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Wymagana rola: {roles.join(' lub ')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * HOC dla stron wymagających określonej roli
 */
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: ('ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'SUPPORT')[]
) {
  return function WrappedComponent(props: P) {
    return (
      <RequireRole roles={roles}>
        <Component {...props} />
      </RequireRole>
    );
  };
}

/**
 * Hook sprawdzający uprawnienia do akcji
 */
export function usePermissions() {
  const { user, isAdmin, isManager, hasRole } = useAuth();

  return {
    // Zarządzanie użytkownikami
    canManageUsers: isAdmin,
    canViewUsers: hasRole(['ADMIN', 'MANAGER']),
    
    // Zarządzanie produktami
    canEditProducts: hasRole(['ADMIN', 'MANAGER']),
    canDeleteProducts: isAdmin,
    canViewProducts: true, // wszyscy zalogowani
    
    // Zarządzanie zamówieniami
    canEditOrders: hasRole(['ADMIN', 'MANAGER', 'SUPPORT']),
    canDeleteOrders: isAdmin,
    canViewOrders: true,
    
    // Magazyn (WMS)
    canManageWarehouse: hasRole(['ADMIN', 'MANAGER', 'WAREHOUSE']),
    canViewInventory: true,
    
    // Ustawienia
    canEditSettings: isAdmin,
    canViewSettings: isManager,
    
    // Raporty
    canViewReports: isManager,
    canExportData: hasRole(['ADMIN', 'MANAGER']),
    
    // Aktywny użytkownik
    user,
    role: user?.role,
  };
}
