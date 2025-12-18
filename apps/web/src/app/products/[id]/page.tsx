'use client';

import { notFound } from 'next/navigation';
import { useState, use, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Breadcrumb from '../../../components/Breadcrumb';
import { productsApi, Product } from '../../../lib/api';
import ProductCard from '../../../components/ProductCard';
import { useCart } from '../../../contexts/CartContext';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Mock data for demonstration - in production this would come from API
const mockProduct: Product = {
  id: '1',
  name: 'Profesjonalny fotel biurowy ergonomiczny - siatka, podparcie lędźwiowe, obrót 360°',
  description: 'Doświadcz doskonałego wsparcia ergonomicznego z naszym profesjonalnym fotelem biurowym z siatki. Zaprojektowany do użytku przez ponad 8 godzin, ten fotel ma oddychający tył z siatki, który utrzymuje Cię w chłodzie podczas pracy. Regulowane podparcie lędźwiowe zapewnia zachowanie naturalnej krzywizny kręgosłupa, zmniejszając zmęczenie i bóle pleców.',
  price: '149.99',
  compareAtPrice: '199.99',
  sku: 'CHAIR-ERG-001',
  status: 'active',
  badge: 'bestseller',
  rating: '4.8',
  reviewCount: 1240,
  storeName: 'OfficeWorld Official',
  hasSmart: true,
  deliveryInfo: 'Dostawa jutro',
  images: [
    { id: '1', url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800', alt: 'Ergonomic chair front view', order: 0 },
    { id: '2', url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400', alt: 'Chair side view', order: 1 },
    { id: '3', url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=400', alt: 'Chair back view', order: 2 },
    { id: '4', url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400', alt: 'Chair details', order: 3 },
    { id: '5', url: 'https://images.unsplash.com/photo-1541558869434-2840d308329a?w=400', alt: 'Chair in office', order: 4 },
  ],
  category: { id: '1', name: 'Ergonomic Chairs', slug: 'ergonomic-chairs' },
  variants: [
    {
      id: 'v1',
      productId: '1',
      name: 'Czarny / Standard',
      sku: 'CHAIR-ERG-001-BLK-STD',
      price: 149.99,
      stock: 25,
      attributes: { Color: 'Czarny', Size: 'Standard' },
    },
    {
      id: 'v2',
      productId: '1',
      name: 'Szary / Standard',
      sku: 'CHAIR-ERG-001-GRY-STD',
      price: 149.99,
      stock: 12,
      attributes: { Color: 'Szary', Size: 'Standard' },
    },
    {
      id: 'v3',
      productId: '1',
      name: 'Czarny / XL',
      sku: 'CHAIR-ERG-001-BLK-XL',
      price: 159.99,
      stock: 6,
      attributes: { Color: 'Czarny', Size: 'XL' },
    },
  ],
};

const mockReviews = [
  {
    id: '1',
    author: 'Michał K.',
    avatar: 'MK',
    rating: 5,
    date: '2 dni temu',
    content: 'Absolutnie kocham ten fotel! Podparcie lędźwiowe to prawdziwa rewolucja dla moich plećw. Montaż był prosty i zajął około 20 minut. Gorąco polecam każdemu pracującemu z domu.',
    hasImage: true,
  },
  {
    id: '2',
    author: 'Anna L.',
    avatar: 'AL',
    rating: 4,
    date: '1 tydzień temu',
    content: 'Dobry fotel za tę cenę. Siatka jest oddychająca, co jest świetne latem. Szkoda tylko, że podłokietniki nie idą trochę wyżej.',
    hasImage: false,
  },
];



export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();

  const variantAttributes = useMemo(() => {
    const variants = product?.variants || [];
    const keys = new Set<string>();
    for (const variant of variants) {
      Object.keys(variant.attributes || {}).forEach((key) => keys.add(key));
    }
    return Array.from(keys);
  }, [product?.variants]);

  const attributeOptions = useMemo(() => {
    const variants = product?.variants || [];
    const options: Record<string, string[]> = {};
    for (const key of variantAttributes) {
      const values = new Set<string>();
      for (const variant of variants) {
        const value = variant.attributes?.[key];
        if (value) values.add(value);
      }
      options[key] = Array.from(values);
    }
    return options;
  }, [product?.variants, variantAttributes]);

  const selectedVariant = useMemo(() => {
    const variants = product?.variants || [];
    if (!variants.length) return null;

    // If we don't have all keys selected yet, treat as not selected.
    if (variantAttributes.some((key) => !selectedAttributes[key])) return null;

    return (
      variants.find((variant) =>
        variantAttributes.every((key) => variant.attributes?.[key] === selectedAttributes[key])
      ) || null
    );
  }, [product?.variants, selectedAttributes, variantAttributes]);

  useEffect(() => {
    if (!product?.variants?.length) return;

    // Initialize selection to first in-stock variant, falling back to first variant
    const initial = product.variants.find((v) => v.stock > 0) || product.variants[0];
    const nextAttrs: Record<string, string> = {};
    for (const key of Object.keys(initial.attributes || {})) {
      nextAttrs[key] = initial.attributes[key];
    }
    setSelectedAttributes(nextAttrs);
    setQuantity(1);
  }, [product?.variants]);

  const handleAttributeChange = (key: string, value: string) => {
    const variants = product?.variants || [];
    const next = { ...selectedAttributes, [key]: value };

    // Try to keep other selections if possible; if not, fall back to any variant with this value.
    const exact = variants.find((v) => variantAttributes.every((k) => next[k] && v.attributes?.[k] === next[k]));
    if (exact) {
      setSelectedAttributes(next);
      return;
    }

    const fallback = variants.find((v) => v.attributes?.[key] === value);
    if (fallback) {
      const filled: Record<string, string> = { ...next };
      for (const k of Object.keys(fallback.attributes || {})) {
        filled[k] = fallback.attributes[k];
      }
      setSelectedAttributes(filled);
      return;
    }

    setSelectedAttributes(next);
  };

  const clampQuantity = useCallback(
    (next: number) => {
      const max = selectedVariant?.stock ?? 999;
      return Math.max(1, Math.min(max, next));
    },
    [selectedVariant?.stock]
  );

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    
    setAddingToCart(true);
    try {
      await addToCart(selectedVariant.id, quantity);
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      try {
        console.log('Fetching product with ID:', id);
        const data = await productsApi.getById(id);
        console.log('Received product data:', data);
        if (data && data.id) {
          setProduct(data);
          setUseMock(false);
        } else {
          console.log('No product data, using mock');
          setProduct(mockProduct);
          setUseMock(true);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        // Use mock data as fallback
        setProduct(mockProduct);
        setUseMock(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // Fetch related products
  useEffect(() => {
    async function fetchRelatedProducts() {
      try {
        // Fetch products from the same category, or just random products if no category
        const categorySlug = product?.category?.slug;
        const response = await productsApi.getAll({
          category: categorySlug,
          limit: 5,
        });
        // Filter out current product and take up to 5
        const filtered = response.products
          .filter((p) => p.id !== id)
          .slice(0, 5);
        setRelatedProducts(filtered);
      } catch (error) {
        console.error('Failed to fetch related products:', error);
      }
    }
    if (product) {
      fetchRelatedProducts();
    }
  }, [product, id]);

  // Parse specifications from product data - must be called before any conditional returns
  const specifications = useMemo(() => {
    if (product?.specifications && typeof product.specifications === 'object') {
      return Object.entries(product.specifications as Record<string, string>).map(([label, value]) => ({
        label,
        value: String(value),
      }));
    }
    return [];
  }, [product?.specifications]);

  // Parse features from description (bullet points starting with •)
  const { mainDescription, features } = useMemo(() => {
    const description = product?.description || '';
    const lines = description.split('\n').filter(line => line.trim());
    
    const featureLines: string[] = [];
    const descLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Check for bullet points (• or **text:**)
      if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
        // Clean up markdown formatting
        let feature = trimmed.replace(/^[•\-]\s*/, '').trim();
        // Remove ** markdown for bold
        feature = feature.replace(/\*\*([^*]+)\*\*/g, '$1');
        featureLines.push(feature);
      } else {
        descLines.push(trimmed);
      }
    }
    
    return {
      mainDescription: descLines.join(' '),
      features: featureLines,
    };
  }, [product?.description]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container-custom py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 aspect-square bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  // Use product images or fallback to mock images
  const images = product.images?.length ? product.images : mockProduct.images;
  const mainImage = images?.[selectedImage]?.url || '/placeholder.jpg';
  const effectivePrice = selectedVariant?.price ?? Number(product.price);
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(effectivePrice);
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(effectivePrice) / Number(product.compareAtPrice)) * 100)
    : 0;

  // Use real category if available
  const categoryName = product.category?.name || 'Produkty';
  const categorySlug = product.category?.slug || '';
  const breadcrumbItems = [
    { label: 'Strona główna', href: '/' },
    { label: categoryName, href: categorySlug ? `/products?category=${categorySlug}` : '/products' },
    { label: product.name },
  ];

  // Use real review count or fallback
  const reviewCount = product.reviewCount || mockProduct.reviewCount;
  const rating = product.rating || mockProduct.rating;

  const tabs = [
    { id: 'description', label: 'Opis produktu' },
    { id: 'parameters', label: 'Parametry' },
    { id: 'reviews', label: `Opinie (${reviewCount})` },
    { id: 'qa', label: 'Pytania' },
  ];

  const ratingDistribution = [
    { stars: 5, percent: 85 },
    { stars: 4, percent: 10 },
    { stars: 3, percent: 5 },
    { stars: 2, percent: 0 },
    { stars: 1, percent: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container-custom py-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Main Product Section */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-4 relative">
              {/* Badge */}
              {product.badge && (
                <span className="absolute top-6 left-6 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded z-10 uppercase">
                  {product.badge}
                </span>
              )}
              
              {/* Main Image */}
              <div className="aspect-square overflow-hidden rounded-lg mb-4">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Thumbnail Gallery */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images?.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index ? 'border-orange-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || `Product image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Product Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 sticky top-24">
              {/* Title */}
              <h1 className="text-xl font-semibold text-gray-900 mb-3 leading-snug">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.floor(Number(product.rating || mockProduct.rating))
                          ? 'text-orange-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-orange-500 font-medium">
                  {product.rating || mockProduct.rating}
                </span>
                <span className="text-sm text-gray-500">
                  ({product.reviewCount || mockProduct.reviewCount} ocen)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-gray-900">
                  ${Number(effectivePrice).toFixed(2)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      ${Number(product.compareAtPrice).toFixed(2)}
                    </span>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Lowest Price Info */}
              <p className="text-xs text-gray-500 mb-3">
                Najniższa cena w ostatnich 30 dniach: $139.99
              </p>

              {/* Installment Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>$7.50 x 20 rat</span>
                <button className="text-orange-500 hover:underline">Oblicz</button>
              </div>

              {/* Variants */}
              {product.variants?.length ? (
                <div className="mb-4 space-y-3">
                  {variantAttributes.map((key) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {key}
                      </label>
                      <select
                        value={selectedAttributes[key] || ''}
                        onChange={(e) => handleAttributeChange(key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="" disabled>
                          Wybierz
                        </option>
                        {(attributeOptions[key] || []).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Ilość</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => clampQuantity(q - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Zmniejsz ilość"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={selectedVariant?.stock ?? undefined}
                        value={quantity}
                        onChange={(e) => setQuantity(clampQuantity(Number(e.target.value || 1)))}
                        className="w-20 h-10 text-center rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => clampQuantity(q + 1))}
                        disabled={!!selectedVariant && quantity >= selectedVariant.stock}
                        className="w-10 h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Zwiększ ilość"
                      >
                        +
                      </button>
                      {selectedVariant && (
                        <span className="text-xs text-gray-500 ml-1">Dostępne: {selectedVariant.stock}</span>
                      )}
                    </div>
                    {variantAttributes.length > 0 && !selectedVariant && (
                      <p className="text-xs text-red-600 mt-1">Wybierz wariant produktu</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Buy Now Button */}
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg mb-3 transition-colors">
                Kup teraz
              </button>

              {/* Add to Cart Button */}
              <button 
                onClick={handleAddToCart}
                disabled={addingToCart || !selectedVariant}
                className="w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold py-3 rounded-lg mb-4 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToCart ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Dodawanie...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Dodaj do koszyka
                  </>
                )}
              </button>

              {/* Stock Status */}
              <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">W magazynie: Wysyłka natychmiast</span>
              </div>

              {/* People Bought */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
                </svg>
                <span><strong>142 osoby</strong> kupiło w ciągu ostatnich 24h</span>
              </div>

              {/* Delivery Info */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dostawa jutro</p>
                    <p className="text-xs text-orange-500">Zamów w ciągu 2h 18m</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">WBTrade Smart!</p>
                    <p className="text-xs text-gray-500">Darmowa dostawa i zwroty</p>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="border-t mt-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">OW</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {product.storeName || mockProduct.storeName}
                      </span>
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-xs text-orange-500">99.8% pozytywnych opinii</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>18k sprzedanych</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Szybka odpowiedź
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-lg mb-8">
          {/* Tab Headers */}
          <div className="border-b">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {product.name}
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {mainDescription || mockProduct.description}
                </p>

                {features.length > 0 && (
                  <ul className="space-y-3 mb-8">
                    {features.map((feature, index) => {
                      const parts = feature.split(':');
                      const hasColon = parts.length > 1;
                      return (
                        <li key={index} className="flex items-start gap-2 text-gray-600">
                          <span className="text-orange-500 mt-1">•</span>
                          {hasColon ? (
                            <span><strong>{parts[0]}:</strong>{parts.slice(1).join(':')}</span>
                          ) : (
                            <span>{feature}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Key Specifications */}
                {specifications.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Kluczowe specyfikacje</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {specifications.slice(0, 6).map((spec, index) => (
                        <div key={index}>
                          <p className="text-xs text-gray-500 mb-1">{spec.label}</p>
                          <p className="text-sm font-medium text-gray-900">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'parameters' && (
              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Parametry techniczne</h2>
                {specifications.length > 0 ? (
                  <div className="divide-y">
                    {specifications.map((spec, index) => (
                      <div key={index} className="py-3 flex">
                        <span className="w-1/3 text-gray-500">{spec.label}</span>
                        <span className="w-2/3 text-gray-900 font-medium">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Brak dostępnych specyfikacji</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {/* Rating Overview */}
                <div className="flex items-start gap-8 mb-8 pb-8 border-b">
                  {/* Average Rating */}
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      {product.rating || mockProduct.rating}
                    </div>
                    <div className="flex items-center justify-center mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.floor(Number(product.rating || mockProduct.rating))
                              ? 'text-orange-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">{product.reviewCount || mockProduct.reviewCount} ocen</p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="flex-1 max-w-sm">
                    {ratingDistribution.map((item) => (
                      <div key={item.stars} className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600 w-4">{item.stars}</span>
                        <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-400 rounded-full"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-10 text-right">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="space-y-6">
                  {mockReviews.map((review) => (
                    <div key={review.id} className="pb-6 border-b last:border-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {review.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{review.author}</span>
                            <span className="text-sm text-gray-500">{review.date}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating ? 'text-orange-400' : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 ml-13 pl-[52px]">{review.content}</p>
                      {review.hasImage && (
                        <div className="mt-3 pl-[52px]">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1592078615290-033ee584e267?w=100"
                              alt="Review attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Show All Reviews Button */}
                <button className="w-full mt-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  Pokaż wszystkie opinie
                </button>
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pytania i odpowiedzi</h2>
                <p className="text-gray-500">Nikt jeszcze nie zadał pytania. Bądź pierwszy!</p>
                <button className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  Zadaj pytanie
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customers Also Viewed */}
        {relatedProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Inni klienci oglądali</h2>
              <div className="flex gap-2">
                <button className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}