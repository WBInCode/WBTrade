'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiJson } from '@/lib/api';
import { 
  Users, 
  Search, 
  Shield, 
  UserPlus, 
  Mail, 
  Check, 
  X, 
  Edit, 
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Key,
  UserCog
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'WAREHOUSE';
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
    addresses: number;
  };
}

interface UserStats {
  totalUsers: number;
  admins: number;
  warehouse: number;
  customers: number;
  activeUsers: number;
  blockedUsers: number;
  newThisMonth: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  WAREHOUSE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CUSTOMER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  WAREHOUSE: 'Magazynier',
  CUSTOMER: 'Klient',
};

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'ADMIN' | 'WAREHOUSE',
  });
  const [newRole, setNewRole] = useState<'CUSTOMER' | 'ADMIN' | 'WAREHOUSE'>('CUSTOMER');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    console.log('loadUsers called, token:', token ? 'exists' : 'null');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      console.log('Fetching users from API...');
      const response = await apiJson.get<{ users: User[]; pagination: Pagination }>(`/api/users?${params}`, token);
      console.log('Users response:', response);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery, roleFilter, statusFilter]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiJson.get<UserStats>('/api/users/stats', token);
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [token]);

  // Load users when dependencies change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load stats only on mount and when token changes
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Reset to page 1 when filters change (but not on initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleCreateUser called, token:', token ? 'exists' : 'null');
    console.log('formData:', formData);
    
    if (!token) {
      setFormError('Brak autoryzacji - zaloguj się ponownie');
      return;
    }
    
    setFormError('');
    setActionLoading(true);
    
    try {
      console.log('Sending create user request...');
      await apiJson.post('/api/users', {
        ...formData,
        phone: formData.phone || undefined,
      }, token);
      
      console.log('User created successfully');
      setShowAddModal(false);
      setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CUSTOMER' });
      loadUsers();
      loadStats();
    } catch (error: any) {
      console.error('Create user error:', error);
      setFormError(error.message || 'Błąd podczas tworzenia użytkownika');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;
    
    setFormError('');
    setActionLoading(true);
    
    try {
      await apiJson.put(`/api/users/${selectedUser.id}`, {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
      }, token);
      
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      setFormError(error.message || 'Błąd podczas aktualizacji użytkownika');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!token || !selectedUser) return;
    
    setActionLoading(true);
    
    try {
      await apiJson.patch(`/api/users/${selectedUser.id}/role`, { role: newRole }, token);
      setShowRoleModal(false);
      setSelectedUser(null);
      loadUsers();
      loadStats();
    } catch (error: any) {
      alert(error.message || 'Błąd podczas zmiany roli');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async (user: User) => {
    if (!token) return;
    
    try {
      await apiJson.post(`/api/users/${user.id}/block`, {}, token);
      loadUsers();
      loadStats();
    } catch (error: any) {
      alert(error.message || 'Błąd podczas blokowania użytkownika');
    }
  };

  const handleUnblockUser = async (user: User) => {
    if (!token) return;
    
    try {
      await apiJson.post(`/api/users/${user.id}/unblock`, {}, token);
      loadUsers();
      loadStats();
    } catch (error: any) {
      alert(error.message || 'Błąd podczas odblokowywania użytkownika');
    }
  };

  const handleUnlockAccount = async (user: User) => {
    if (!token) return;
    
    try {
      await apiJson.post(`/api/users/${user.id}/unlock`, {}, token);
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Błąd podczas odblokowywania konta');
    }
  };

  const handleResetPassword = async () => {
    if (!token || !selectedUser) return;
    
    setFormError('');
    setActionLoading(true);
    
    try {
      await apiJson.post(`/api/users/${selectedUser.id}/reset-password`, { password: newPassword }, token);
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      alert('Hasło zostało zmienione');
    } catch (error: any) {
      setFormError(error.message || 'Błąd podczas resetowania hasła');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!token || !selectedUser) return;
    
    setActionLoading(true);
    
    try {
      await apiJson.delete(`/api/users/${selectedUser.id}`, token);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
      loadStats();
    } catch (error: any) {
      alert(error.message || 'Błąd podczas usuwania użytkownika');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setFormError('');
    setShowResetPasswordModal(true);
  };

  const isAccountLocked = (user: User) => {
    return user.lockedUntil && new Date(user.lockedUntil) > new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Użytkownicy</h1>
          <p className="text-gray-400">Zarządzaj użytkownikami systemu</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CUSTOMER' });
            setFormError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Dodaj użytkownika
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Wszyscy</p>
                <p className="text-xl font-bold text-white">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Admini</p>
                <p className="text-xl font-bold text-white">{stats.admins}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <UserCog className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Magazynierzy</p>
                <p className="text-xl font-bold text-white">{stats.warehouse}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Klienci</p>
                <p className="text-xl font-bold text-white">{stats.customers}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Aktywni</p>
                <p className="text-xl font-bold text-white">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Zablokowani</p>
                <p className="text-xl font-bold text-white">{stats.blockedUsers}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <UserPlus className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Nowi (miesiąc)</p>
                <p className="text-xl font-bold text-white">{stats.newThisMonth}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj użytkowników..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Wszystkie role</option>
          <option value="ADMIN">Administratorzy</option>
          <option value="WAREHOUSE">Magazynierzy</option>
          <option value="CUSTOMER">Klienci</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Wszystkie statusy</option>
          <option value="true">Aktywni</option>
          <option value="false">Zablokowani</option>
        </select>
        <button 
          onClick={() => { loadUsers(); loadStats(); }}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-800/80">
                <th className="px-6 py-4">Użytkownik</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rola</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Zamówienia</th>
                <th className="px-6 py-4">Ostatnie logowanie</th>
                <th className="px-6 py-4">Data rejestracji</th>
                <th className="px-6 py-4">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4">
                      <div className="h-12 bg-slate-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Brak użytkowników</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                        {user.emailVerified && (
                          <span title="Email zweryfikowany">
                            <Check className="w-3 h-3 text-green-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openRoleModal(user)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${roleColors[user.role]} hover:opacity-80 transition-opacity`}
                      >
                        {roleLabels[user.role] || user.role}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <Check className="w-4 h-4" /> Aktywny
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <X className="w-4 h-4" /> Zablokowany
                          </span>
                        )}
                        {isAccountLocked(user) && (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs">
                            <AlertTriangle className="w-3 h-3" /> Konto zablokowane
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {user._count?.orders || 0}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Edytuj"
                        >
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                        <button 
                          onClick={() => openResetPasswordModal(user)}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Resetuj hasło"
                        >
                          <Key className="w-4 h-4 text-yellow-400" />
                        </button>
                        {user.isActive ? (
                          <button 
                            onClick={() => handleBlockUser(user)}
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            title="Zablokuj"
                          >
                            <Lock className="w-4 h-4 text-red-400" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUnblockUser(user)}
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            title="Odblokuj"
                          >
                            <Unlock className="w-4 h-4 text-green-400" />
                          </button>
                        )}
                        {isAccountLocked(user) && (
                          <button 
                            onClick={() => handleUnlockAccount(user)}
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            title="Odblokuj konto (błędne logowania)"
                          >
                            <RefreshCw className="w-4 h-4 text-yellow-400" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
            <p className="text-sm text-gray-400">
              Pokazuje {((page - 1) * 15) + 1} - {Math.min(page * 15, pagination.total)} z {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </button>
              <span className="px-3 py-1 text-gray-300 text-sm">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Dodaj użytkownika</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Imię *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nazwisko *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hasło *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  minLength={8}
                  placeholder="Min. 8 znaków, duże/małe litery, cyfry"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rola</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="CUSTOMER">Klient</option>
                  <option value="WAREHOUSE">Magazynier</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              {formError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Tworzenie...' : 'Utwórz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Edytuj użytkownika</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Imię *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nazwisko *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {formError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Zmień rolę</h2>
            <p className="text-gray-400 mb-4">
              Zmiana roli dla: <span className="text-white">{selectedUser.firstName} {selectedUser.lastName}</span>
            </p>
            <div className="space-y-3 mb-6">
              {(['CUSTOMER', 'WAREHOUSE', 'ADMIN'] as const).map((role) => (
                <label 
                  key={role}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${
                    newRole === role ? 'bg-orange-500/20 border-orange-500/50' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={newRole === role}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <div>
                    <p className="text-white font-medium">{roleLabels[role]}</p>
                    <p className="text-xs text-gray-400">
                      {role === 'ADMIN' && 'Pełny dostęp do systemu'}
                      {role === 'WAREHOUSE' && 'Dostęp do magazynu'}
                      {role === 'CUSTOMER' && 'Podstawowy dostęp klienta'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowRoleModal(false); setSelectedUser(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleChangeRole}
                disabled={actionLoading || newRole === selectedUser.role}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Zmieniam...' : 'Zmień rolę'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Resetuj hasło</h2>
            <p className="text-gray-400 mb-4">
              Nowe hasło dla: <span className="text-white">{selectedUser.firstName} {selectedUser.lastName}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Nowe hasło *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                minLength={8}
                placeholder="Min. 8 znaków"
              />
              <p className="text-xs text-gray-500 mt-1">
                Wymagane: duże i małe litery, cyfry, znaki specjalne
              </p>
            </div>
            {formError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowResetPasswordModal(false); setSelectedUser(null); setNewPassword(''); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading || newPassword.length < 8}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Resetuję...' : 'Resetuj hasło'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Usuń użytkownika</h2>
            </div>
            <p className="text-gray-400 mb-6">
              Czy na pewno chcesz usunąć użytkownika <span className="text-white font-medium">{selectedUser.firstName} {selectedUser.lastName}</span>?
              {selectedUser._count?.orders && selectedUser._count.orders > 0 && (
                <span className="block mt-2 text-yellow-400 text-sm">
                  Użytkownik ma {selectedUser._count.orders} zamówień - konto zostanie tylko zdezaktywowane.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
