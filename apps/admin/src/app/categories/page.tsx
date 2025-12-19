'use client';

import { useState, useEffect } from 'react';
import { 
  FolderTree, Plus, Edit, Trash2, ChevronRight, Package, 
  X, Save, GripVertical, Search, Check, Image as ImageIcon
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId: string | null;
  _count?: {
    products: number;
    children: number;
  };
  children?: Category[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  images: { url: string }[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Assign products modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningCategory, setAssigningCategory] = useState<Category | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: ''
  });

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/categories');
      const data = await response.json();
      const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
      
      // API zwraca już drzewo z children - spłaszczamy do płaskiej listy
      const flattenCategories = (cats: Category[]): Category[] => {
        const result: Category[] = [];
        const flatten = (items: Category[]) => {
          items.forEach(cat => {
            // Kopiujemy kategorię z _count z productCount
            result.push({
              ...cat,
              _count: { 
                products: (cat as any).productCount || cat._count?.products || 0,
                children: cat.children?.length || 0
              }
            });
            if (cat.children && cat.children.length > 0) {
              flatten(cat.children);
            }
          });
        };
        flatten(cats);
        return result;
      };
      
      setCategories(flattenCategories(categoriesArray));
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch('http://localhost:5000/api/products?limit=1000');
      const data = await response.json();
      const productsArray = Array.isArray(data) ? data : (data.products || []);
      setProducts(productsArray);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openAddModal = (parentId: string | null = null) => {
    setModalMode('add');
    setForm({
      name: '',
      slug: '',
      description: '',
      image: '',
      parentId: parentId || ''
    });
    setEditingCategory(null);
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setModalMode('edit');
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || ''
    });
    setEditingCategory(category);
    setShowModal(true);
  };

  const openAssignModal = (category: Category) => {
    setAssigningCategory(category);
    // Pre-select products already in this category
    const productsInCategory = products.filter(p => p.categoryId === category.id);
    setSelectedProducts(new Set(productsInCategory.map(p => p.id)));
    setProductSearch('');
    setShowAssignModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Nazwa kategorii jest wymagana');
      return;
    }

    try {
      const url = modalMode === 'add' 
        ? 'http://localhost:5000/api/categories'
        : `http://localhost:5000/api/categories/${editingCategory?.id}`;
      
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || generateSlug(form.name),
          description: form.description || null,
          image: form.image || null,
          parentId: form.parentId || null
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      
      await loadCategories();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Blad podczas zapisywania kategorii');
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Czy na pewno chcesz usunac kategorie "${category.name}"? Produkty w tej kategorii zostana bez kategorii.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/categories/${category.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');
      
      await loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Blad podczas usuwania kategorii');
    }
  };

  const handleAssignProducts = async () => {
    if (!assigningCategory) return;

    try {
      // Get products that should be in this category (newly selected)
      const productsToAssign = Array.from(selectedProducts);
      
      // Update each product's category
      for (const productId of productsToAssign) {
        const currentProduct = products.find(p => p.id === productId);
        if (currentProduct?.categoryId !== assigningCategory.id) {
          await fetch(`http://localhost:5000/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: assigningCategory.id })
          });
        }
      }

      // Remove products that were unselected
      const productsInCategory = products.filter(p => p.categoryId === assigningCategory.id);
      for (const product of productsInCategory) {
        if (!selectedProducts.has(product.id)) {
          await fetch(`http://localhost:5000/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: null })
          });
        }
      }

      await loadProducts();
      await loadCategories();
      setShowAssignModal(false);
    } catch (error) {
      console.error('Failed to assign products:', error);
      alert('Blad podczas przypisywania produktow');
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-3 p-4 hover:bg-slate-700/30 transition-colors group ${
            level > 0 ? 'border-l-2 border-slate-700 ml-6' : ''
          }`}
          style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-slate-600 rounded transition-colors"
            >
              <ChevronRight
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          {category.image ? (
            <img 
              src={category.image} 
              alt={category.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <FolderTree className="w-5 h-5 text-orange-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{category.name}</p>
            <p className="text-sm text-gray-400 truncate">/{category.slug}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => openAssignModal(category)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-orange-400 transition-colors"
            >
              <Package className="w-4 h-4" />
              {category._count?.products || 0} produktow
            </button>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => openAddModal(category.id)}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                title="Dodaj podkategorie"
              >
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={() => openEditModal(category)}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                title="Edytuj"
              >
                <Edit className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={() => handleDelete(category)}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                title="Usun"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Build tree structure
  const buildTree = (cats: Category[]): Category[] => {
    if (!Array.isArray(cats) || cats.length === 0) return [];
    
    const map = new Map<string, Category>();
    const roots: Category[] = [];
    
    cats.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
    
    cats.forEach(cat => {
      const item = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(item);
      } else {
        roots.push(item);
      }
    });
    
    return roots;
  };

  const categoryTree = buildTree(categories);

  // Get flat list of categories for parent selection (excluding current category and its children)
  const getParentOptions = (excludeId?: string): Category[] => {
    const result: Category[] = [];
    
    const getChildIds = (catId: string): string[] => {
      const ids = [catId];
      categories.filter(c => c.parentId === catId).forEach(c => {
        ids.push(...getChildIds(c.id));
      });
      return ids;
    };
    
    const excludeIds = excludeId ? getChildIds(excludeId) : [];
    
    categories.forEach(cat => {
      if (!excludeIds.includes(cat.id)) {
        result.push(cat);
      }
    });
    
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kategorie</h1>
          <p className="text-gray-400">Zarzadzaj kategoriami produktow</p>
        </div>
        <button 
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Dodaj kategorie
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-gray-400 text-sm">Wszystkie kategorie</p>
          <p className="text-2xl font-bold text-white mt-1">{categories.length}</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-gray-400 text-sm">Kategorie glowne</p>
          <p className="text-2xl font-bold text-white mt-1">{categoryTree.length}</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-gray-400 text-sm">Podkategorie</p>
          <p className="text-2xl font-bold text-white mt-1">{categories.length - categoryTree.length}</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-gray-400 text-sm">Produktow w kategoriach</p>
          <p className="text-2xl font-bold text-white mt-1">
            {categories.reduce((sum, c) => sum + (c._count?.products || 0), 0)}
          </p>
        </div>
      </div>

      {/* Categories Tree */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="font-medium text-white">Struktura kategorii</h2>
          <button
            onClick={() => setExpandedIds(new Set(categories.map(c => c.id)))}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Rozwin wszystkie
          </button>
        </div>
        
        <div className="divide-y divide-slate-700/50">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-12 bg-slate-700 rounded animate-pulse"></div>
              </div>
            ))
          ) : categoryTree.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Brak kategorii</p>
              <p className="text-sm mt-2">Dodaj pierwsza kategorie, aby rozpoczac</p>
            </div>
          ) : (
            categoryTree.map(category => renderCategory(category))
          )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-medium text-white">
                {modalMode === 'add' ? 'Dodaj kategorie' : 'Edytuj kategorie'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nazwa kategorii *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="np. Elektronika"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="np. elektronika"
                />
              </div>

              {/* Parent Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kategoria nadrzedna
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm(prev => ({ ...prev, parentId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Brak (kategoria glowna) --</option>
                  {getParentOptions(editingCategory?.id).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Opis
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Opis kategorii..."
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL obrazka
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="https://..."
                  />
                  {form.image && (
                    <img 
                      src={form.image} 
                      alt="Preview" 
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                {modalMode === 'add' ? 'Dodaj' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Products Modal */}
      {showAssignModal && assigningCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h2 className="text-lg font-medium text-white">
                  Przypisz produkty do kategorii
                </h2>
                <p className="text-sm text-gray-400">{assigningCategory.name}</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Search */}
            <div className="p-4 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="Szukaj produktow..."
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Zaznaczono: {selectedProducts.size} produktow
              </p>
            </div>
            
            {/* Products list */}
            <div className="flex-1 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Brak produktow</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => toggleProductSelection(product.id)}
                      className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                        selectedProducts.has(product.id)
                          ? 'bg-orange-500/10'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedProducts.has(product.id)
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-slate-600'
                      }`}>
                        {selectedProducts.has(product.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      
                      {product.images?.[0]?.url ? (
                        <img 
                          src={product.images[0].url} 
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{product.name}</p>
                        <p className="text-sm text-gray-400">{product.sku}</p>
                      </div>
                      
                      {product.categoryId && product.categoryId !== assigningCategory.id && (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                          W innej kategorii
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleAssignProducts}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                Zapisz ({selectedProducts.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
