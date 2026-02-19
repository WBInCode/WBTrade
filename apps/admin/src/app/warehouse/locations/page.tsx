'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, X, Check, Warehouse,
  ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { getAuthToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  WAREHOUSE: { label: 'Magazyn', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  ZONE: { label: 'Strefa', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  SHELF: { label: 'Regał', color: 'text-green-400', bg: 'bg-green-500/20' },
  BIN: { label: 'Pojemnik', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
};

interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  parentId: string | null;
  createdAt: string;
  parent: { id: string; name: string; code: string } | null;
  _count: { inventory: number; children: number };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'WAREHOUSE', parentId: '', isActive: true });

  useEffect(() => {
    loadLocations();
  }, [showInactive]);

  async function apiCall(endpoint: string, options?: RequestInit) {
    const token = getAuthToken();
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
  }

  async function loadLocations() {
    try {
      setLoading(true);
      const res = await apiCall(`/admin/warehouse/locations?includeInactive=${showInactive}`);
      if (res.ok) setLocations(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveLocation() {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/admin/warehouse/locations/${editingId}` : '/admin/warehouse/locations';
      const res = await apiCall(url, { method, body: JSON.stringify(form) });
      if (res.ok) {
        closeModal();
        loadLocations();
      } else {
        const err = await res.json();
        alert(err.error || 'Błąd');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteLocation(id: string) {
    try {
      const res = await apiCall(`/admin/warehouse/locations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        loadLocations();
      } else {
        const err = await res.json();
        alert(err.error || 'Błąd');
      }
    } catch (err) {
      console.error(err);
    }
  }

  function openEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({ name: loc.name, code: loc.code, type: loc.type, parentId: loc.parentId || '', isActive: loc.isActive });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', code: '', type: 'WAREHOUSE', parentId: '', isActive: true });
  }

  // Group by type for display
  const grouped = locations.reduce((acc, loc) => {
    const t = loc.type;
    if (!acc[t]) acc[t] = [];
    acc[t].push(loc);
    return acc;
  }, {} as Record<string, Location[]>);

  const typeOrder = ['WAREHOUSE', 'ZONE', 'SHELF', 'BIN'];

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MapPin className="w-7 h-7 text-orange-500" />
            Lokalizacje magazynowe
          </h1>
          <p className="text-slate-400 mt-1">Magazyny, strefy, regały i pojemniki</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              showInactive
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-admin-card text-slate-400 border border-admin-border hover:text-white'
            }`}
          >
            {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Nieaktywne
          </button>
          <button
            onClick={() => { setEditingId(null); setForm({ name: '', code: '', type: 'WAREHOUSE', parentId: '', isActive: true }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nowa lokalizacja
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {typeOrder.map((t) => {
          const info = TYPE_LABELS[t];
          const count = grouped[t]?.length || 0;
          return (
            <div key={t} className="bg-admin-card border border-admin-border rounded-lg p-4">
              <p className="text-xs text-slate-400">{info.label}</p>
              <p className={`text-2xl font-bold mt-1 ${info.color}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Location list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 bg-admin-card border border-admin-border rounded-lg">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mb-2"></div>
          <p>Ładowanie...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-admin-card border border-admin-border rounded-lg">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Brak lokalizacji</p>
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.filter((t) => grouped[t]?.length > 0).map((t) => {
            const info = TYPE_LABELS[t];
            return (
              <div key={t}>
                <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${info.color}`}>
                  <span className={`w-2 h-2 rounded-full ${info.bg.replace('/20', '')}`}></span>
                  {info.label} ({grouped[t].length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped[t].map((loc) => (
                    <div
                      key={loc.id}
                      className={`bg-admin-card border rounded-lg p-4 transition-colors ${
                        loc.isActive ? 'border-admin-border hover:border-slate-600' : 'border-red-500/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-medium">{loc.name}</h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{loc.code}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${info.bg} ${info.color}`}>
                          {info.label}
                        </span>
                      </div>

                      {loc.parent && (
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          Nadrzędna: {loc.parent.name} ({loc.parent.code})
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span>{loc._count.inventory} pozycji</span>
                        {loc._count.children > 0 && <span>{loc._count.children} podlokalizacji</span>}
                        {!loc.isActive && <span className="text-red-400">Nieaktywna</span>}
                      </div>

                      <div className="flex gap-1 mt-3">
                        <button
                          onClick={() => openEdit(loc)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-orange-400 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" /> Edytuj
                        </button>
                        {loc._count.inventory === 0 && (
                          deleteConfirm === loc.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => deleteLocation(loc.id)}
                                className="px-2 py-1.5 text-xs text-red-400 bg-red-500/20 rounded hover:bg-red-500/30">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1.5 text-xs text-slate-400 bg-slate-800 rounded hover:bg-slate-700">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(loc.id)}
                              className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-admin-card border border-admin-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-admin-border">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edytuj lokalizację' : 'Nowa lokalizacja'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Nazwa</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="np. Magazyn główny"
                  className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Kod (unikalny)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="np. MAG-01"
                  className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Typ</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  {typeOrder.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Lokalizacja nadrzędna</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-admin-border rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="">Brak (główna)</option>
                  {locations.filter((l) => l.id !== editingId).map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-admin-border bg-slate-800"
                />
                <label className="text-sm text-slate-300">Aktywna</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-admin-border">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Anuluj
              </button>
              <button
                onClick={saveLocation}
                disabled={!form.name || !form.code}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editingId ? 'Zapisz' : 'Utwórz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
