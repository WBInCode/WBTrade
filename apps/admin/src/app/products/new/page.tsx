'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ArrowRight, Save, Package, Image, Tag, 
  Box, Check, X, Plus, Trash2, Upload, GripVertical
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

interface Category {
  id: string;
  name: string;
}

interface Variant {
  id?: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

interface ProductImage {
  url: string;
  alt: string;
  order: number;
}

const STEPS = [
  { id: 1, name: 'Informacje', icon: Package },
  { id: 2, name: 'Zdjecia', icon: Image },
  { id: 3, name: 'Warianty', icon: Tag },
  { id: 4, name: 'Podsumowanie', icon: Check },
];

export default function NewProductPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form data
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [stock, setStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [weight, setWeight] = useState('');
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  
  // Images
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  
  // Variants
  const [variants, setVariants] = useState<Variant[]>([]);
  const [hasVariants, setHasVariants] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !slug) {
      setSlug(name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-'));
    }
  }, [name]);

  // Auto-generate SKU
  useEffect(() => {
    if (name && !sku) {
      const prefix = name.substring(0, 3).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setSku(`${prefix}-${random}`);
    }
  }, [name]);

  async function loadCategories() {
    try {
      const response = await fetch('http://localhost:5000/api/categories');
      const data = await response.json();
      const cats = Array.isArray(data) ? data : (data.categories || []);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  const addImage = () => {
    if (imageUrl) {
      setImages([...images, { url: imageUrl, alt: name, order: images.length }]);
      setImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    setVariants([...variants, {
      name: '',
      sku: `${sku}-V${variants.length + 1}`,
      price: parseFloat(price) || 0,
      stock: 0,
      attributes: {}
    }]);
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addSpecification = () => {
    setSpecifications({ ...specifications, '': '' });
  };

  const updateSpecification = (oldKey: string, newKey: string, value: string) => {
    const updated = { ...specifications };
    if (oldKey !== newKey) {
      delete updated[oldKey];
    }
    updated[newKey] = value;
    setSpecifications(updated);
  };

  const removeSpecification = (key: string) => {
    const updated = { ...specifications };
    delete updated[key];
    setSpecifications(updated);
  };

  const validateStep = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return name && sku && price && categoryId;
      case 2:
        return true; // Images are optional
      case 3:
        return !hasVariants || variants.every(v => v.name && v.sku && v.price >= 0);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      alert('Brak autoryzacji. Zaloguj się ponownie.');
      return;
    }
    
    setSaving(true);
    try {
      const productData = {
        name,
        slug,
        sku,
        description,
        shortDescription,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        categoryId,
        status,
        stock: parseInt(stock),
        lowStockThreshold: parseInt(lowStockThreshold),
        weight: weight ? parseFloat(weight) : null,
        specifications,
        images: images.map((img, i) => ({ ...img, order: i })),
        variants: hasVariants ? variants : [],
      };

      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/products/${data.id}`);
      } else {
        const error = await response.json();
        alert(`Blad: ${error.message || 'Nie udalo sie utworzyc produktu'}`);
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Wystapil blad podczas tworzenia produktu');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(4, s + 1));
    } else {
      alert('Wypelnij wszystkie wymagane pola');
    }
  };

  const prevStep = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/products" className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nowy produkt</h1>
          <p className="text-gray-400">Krok {step} z 4</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === s.id
                  ? 'bg-orange-500 text-white'
                  : step > s.id
                  ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30'
                  : 'bg-slate-700 text-gray-400'
              }`}
            >
              {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden md:inline">{s.name}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${step > s.id ? 'bg-green-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white mb-4">Informacje podstawowe</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nazwa produktu *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="np. iPhone 15 Pro Max"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="iphone-15-pro-max"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SKU *</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Kategoria *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Wybierz kategorie</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cena (PLN) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cena przed promocja</label>
                <input
                  type="number"
                  step="0.01"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stan magazynowy</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="DRAFT">Szkic</option>
                  <option value="ACTIVE">Aktywny</option>
                  <option value="ARCHIVED">Zarchiwizowany</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Krotki opis</label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Krotki opis widoczny na liscie produktow"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Pelny opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Szczegolowy opis produktu..."
              />
            </div>

            {/* Specifications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-400">Specyfikacja</label>
                <button
                  onClick={addSpecification}
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  + Dodaj pole
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(specifications).map(([key, value], i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => updateSpecification(key, e.target.value, value)}
                      placeholder="Nazwa"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateSpecification(key, key, e.target.value)}
                      placeholder="Wartosc"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => removeSpecification(key)}
                      className="p-2 hover:bg-slate-700 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Images */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white mb-4">Zdjecia produktu</h2>
            
            {/* Add Image URL */}
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL zdjecia (https://...)"
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={addImage}
                disabled={!imageUrl}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Przeciagnij zdjecia tutaj lub kliknij, aby wybrac</p>
              <p className="text-sm text-gray-500">(Upload plikow w przygotowaniu - uzywaj URL)</p>
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="w-full h-32 object-cover rounded-lg bg-slate-700"
                    />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">
                        Glowne
                      </span>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Variants */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white mb-4">Warianty produktu</h2>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-white">Produkt ma warianty (rozmiary, kolory, itp.)</span>
            </label>

            {hasVariants && (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={addVariant}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj wariant
                  </button>
                </div>

                {variants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Brak wariantow</p>
                    <p className="text-sm">Kliknij "Dodaj wariant" aby utworzyc pierwszy wariant</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variants.map((variant, i) => (
                      <div key={i} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                          <GripVertical className="w-5 h-5 text-gray-500 cursor-move" />
                          <span className="text-gray-400 text-sm">Wariant {i + 1}</span>
                          <button
                            onClick={() => removeVariant(i)}
                            className="ml-auto p-1 hover:bg-slate-700 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Nazwa wariantu</label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => updateVariant(i, 'name', e.target.value)}
                              placeholder="np. Czerwony / XL"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">SKU</label>
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => updateVariant(i, 'sku', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Cena (PLN)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => updateVariant(i, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Stan</label>
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(i, 'stock', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white mb-4">Podsumowanie</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Info */}
              <div className="p-4 bg-slate-900 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-3">Informacje</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Nazwa:</dt>
                    <dd className="text-white font-medium">{name || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">SKU:</dt>
                    <dd className="text-white font-mono">{sku || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Cena:</dt>
                    <dd className="text-white font-medium">{price ? `${price} PLN` : '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Stan:</dt>
                    <dd className="text-white">{stock} szt.</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Status:</dt>
                    <dd className={status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}>{status}</dd>
                  </div>
                </dl>
              </div>

              {/* Images */}
              <div className="p-4 bg-slate-900 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-3">Zdjecia ({images.length})</h3>
                {images.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img.url} alt="" className="w-16 h-16 object-cover rounded" />
                    ))}
                    {images.length > 4 && (
                      <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center text-gray-400 text-sm">
                        +{images.length - 4}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Brak zdjec</p>
                )}
              </div>

              {/* Variants */}
              {hasVariants && (
                <div className="p-4 bg-slate-900 rounded-lg md:col-span-2">
                  <h3 className="text-sm text-gray-400 mb-3">Warianty ({variants.length})</h3>
                  {variants.length > 0 ? (
                    <div className="space-y-2">
                      {variants.map((v, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-white">{v.name || `Wariant ${i + 1}`}</span>
                          <span className="text-gray-400">{v.price} PLN / {v.stock} szt.</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Brak wariantow</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Wstecz
        </button>
        
        {step < 4 ? (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Dalej
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Zapisz produkt
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
