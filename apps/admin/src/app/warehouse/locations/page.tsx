'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  MapPin,
  Plus,
  Edit,
  Trash2,
  Building2,
  Layers,
  Box,
  Package,
  X,
  Save,
  ChevronRight
} from 'lucide-react';

interface Location {
  id: string;
  name: string;
  code: string;
  type: 'WAREHOUSE' | 'ZONE' | 'SHELF' | 'BIN';
  parentId: string | null;
  isActive: boolean;
  parent: Location | null;
  children: Location[];
  _count: {
    inventory: number;
  };
}

const locationTypeLabels: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  WAREHOUSE: { label: 'Magazyn', icon: Building2, color: 'text-blue-400 bg-blue-500/20' },
  ZONE: { label: 'Strefa', icon: Layers, color: 'text-green-400 bg-green-500/20' },
  SHELF: { label: 'Regał', icon: Box, color: 'text-yellow-400 bg-yellow-500/20' },
  BIN: { label: 'Półka/Bin', icon: Package, color: 'text-purple-400 bg-purple-500/20' },
};

export default function LocationsPage() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'WAREHOUSE' as Location['type'],
    parentId: ''
  });

  useEffect(() => {
    loadLocations();
  }, [token]);

  async function loadLocations() {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/api/locations?includeInactive=true', token);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = (parentId?: string, parentType?: string) => {
    let defaultType: Location['type'] = 'WAREHOUSE';
    if (parentType === 'WAREHOUSE') defaultType = 'ZONE';
    else if (parentType === 'ZONE') defaultType = 'SHELF';
    else if (parentType === 'SHELF') defaultType = 'BIN';
    
    setFormData({
      name: '',
      code: '',
      type: defaultType,
      parentId: parentId || ''
    });
    setEditingLocation(null);
    setShowModal(true);
    setError(null);
  };

  const openEditModal = (location: Location) => {
    setFormData({
      name: location.name,
      code: location.code,
      type: location.type,
      parentId: location.parentId || ''
    });
    setEditingLocation(location);
    setShowModal(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...formData,
        parentId: formData.parentId || undefined
      };

      let res;
      if (editingLocation) {
        res = await api.put(`/api/locations/${editingLocation.id}`, payload, token);
      } else {
        res = await api.post('/api/locations', payload, token);
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Błąd zapisu');
      }

      setShowModal(false);
      loadLocations();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (location: Location) => {
    if (!token) return;
    
    if (location._count.inventory > 0) {
      alert('Nie można usunąć lokalizacji z towarem. Przenieś najpierw stan magazynowy.');
      return;
    }

    if (!confirm(`Czy na pewno chcesz usunąć lokalizację "${location.name}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/locations/${location.id}`, token);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Błąd usuwania');
      }
      loadLocations();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Organize locations hierarchically
  const warehouses = locations.filter(l => l.type === 'WAREHOUSE' && l.isActive);
  const getChildren = (parentId: string) => locations.filter(l => l.parentId === parentId && l.isActive);

  // Get available parent locations for the form
  const getAvailableParents = () => {
    if (formData.type === 'WAREHOUSE') return [];
    if (formData.type === 'ZONE') return locations.filter(l => l.type === 'WAREHOUSE' && l.isActive);
    if (formData.type === 'SHELF') return locations.filter(l => (l.type === 'WAREHOUSE' || l.type === 'ZONE') && l.isActive);
    if (formData.type === 'BIN') return locations.filter(l => (l.type === 'SHELF' || l.type === 'ZONE') && l.isActive);
    return [];
  };

  const renderLocationTree = (location: Location, level = 0) => {
    const typeInfo = locationTypeLabels[location.type];
    const TypeIcon = typeInfo.icon;
    const children = getChildren(location.id);

    return (
      <div key={location.id}>
        <div 
          className={`flex items-center gap-3 p-3 hover:bg-slate-700/50 rounded-lg transition-colors ${
            level > 0 ? 'ml-' + (level * 6) : ''
          }`}
          style={{ marginLeft: level * 24 }}
        >
          {level > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
          <div className={`p-2 rounded-lg ${typeInfo.color}`}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{location.name}</p>
            <p className="text-xs text-gray-400">
              {location.code} • {typeInfo.label}
              {location._count.inventory > 0 && (
                <span className="ml-2 text-orange-400">
                  {location._count.inventory} pozycji
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {location.type !== 'BIN' && (
              <button
                onClick={() => openCreateModal(location.id, location.type)}
                className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                title="Dodaj podlokalizację"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => openEditModal(location)}
              className="p-2 text-gray-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
              title="Edytuj"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(location)}
              disabled={location._count.inventory > 0 || children.length > 0}
              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={location._count.inventory > 0 ? 'Lokalizacja zawiera towar' : children.length > 0 ? 'Usuń najpierw podlokalizacje' : 'Usuń'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {children.map(child => renderLocationTree(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/warehouse"
            className="p-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Lokalizacje magazynowe</h1>
            <p className="text-gray-400">Zarządzaj strukturą magazynu</p>
          </div>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nowa lokalizacja
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
        {Object.entries(locationTypeLabels).map(([type, info]) => {
          const Icon = info.icon;
          return (
            <div key={type} className="flex items-center gap-2 text-sm">
              <div className={`p-1.5 rounded ${info.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-gray-300">{info.label}</span>
            </div>
          );
        })}
      </div>

      {/* Locations Tree */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-700 rounded animate-pulse" />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Brak lokalizacji</p>
            <p className="text-sm mt-2">Utwórz pierwszą lokalizację typu "Magazyn"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {warehouses.map(warehouse => renderLocationTree(warehouse))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-medium text-white">
                {editingLocation ? 'Edytuj lokalizację' : 'Nowa lokalizacja'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Typ lokalizacji *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Location['type'], parentId: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="WAREHOUSE">Magazyn</option>
                  <option value="ZONE">Strefa</option>
                  <option value="SHELF">Regał</option>
                  <option value="BIN">Półka / Bin</option>
                </select>
              </div>

              {formData.type !== 'WAREHOUSE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Lokalizacja nadrzędna *
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Wybierz</option>
                    {getAvailableParents().map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code}) - {locationTypeLabels[loc.type].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nazwa *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Magazyn główny"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Kod (unikalny) *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="np. MAG-01 lub A1-01"
                  maxLength={20}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 20 znaków, bez spacji</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingLocation ? 'Zapisz' : 'Utwórz'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
