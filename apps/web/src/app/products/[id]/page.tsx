'use client';

import { notFound, useRouter } from 'next/navigation';
import { useState, use, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Breadcrumb from '../../../components/Breadcrumb';
import { productsApi, reviewsApi, Product, Review, ReviewStats, CanReviewResult } from '../../../lib/api';
import ProductCard from '../../../components/ProductCard';
import { useCart } from '../../../contexts/CartContext';
import { cleanCategoryName } from '../../../lib/categories';

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





export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();
  const router = useRouter();

  // Cart error state for displaying error messages
  const [cartError, setCartError] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [canReviewInfo, setCanReviewInfo] = useState<CanReviewResult | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsSortBy, setReviewsSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest');
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({ rating: 5, title: '', content: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

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

  // Check if product/variant is out of stock
  const isOutOfStock = useMemo(() => {
    if (!selectedVariant) {
      // If no variant selected, check if ALL variants are out of stock
      const variants = product?.variants || [];
      if (variants.length === 0) return true;
      return variants.every(v => (v.stock ?? 0) <= 0);
    }
    return (selectedVariant.stock ?? 0) <= 0;
  }, [selectedVariant, product?.variants]);

  // Clear cart error after 5 seconds
  useEffect(() => {
    if (cartError) {
      const timer = setTimeout(() => setCartError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [cartError]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    if (isOutOfStock) {
      setCartError('Produkt jest niedostępny (brak na stanie)');
      return;
    }
    
    setAddingToCart(true);
    setCartError(null);
    try {
      await addToCart(selectedVariant.id, quantity);
      // Could show a toast notification here
    } catch (err: any) {
      console.error('Failed to add to cart:', err);
      setCartError(err?.message || 'Nie udało się dodać produktu do koszyka');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;
    if (isOutOfStock) {
      setCartError('Produkt jest niedostępny (brak na stanie)');
      return;
    }
    
    setBuyingNow(true);
    setCartError(null);
    try {
      await addToCart(selectedVariant.id, quantity);
      router.push('/checkout');
    } catch (err: any) {
      console.error('Failed to buy now:', err);
      setCartError(err?.message || 'Nie udało się dodać produktu do koszyka');
      setBuyingNow(false);
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      try {
        console.log('Fetching product with ID/Slug:', id);
        let data: Product | null = null;
        
        // Check if id looks like a UUID (contains dashes) or is a slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        if (isUuid) {
          // Try fetching by ID first
          data = await productsApi.getById(id);
        } else {
          // Try fetching by slug
          try {
            data = await productsApi.getBySlug(id);
          } catch (slugError) {
            console.log('Slug lookup failed, trying as ID:', slugError);
            // Fallback to ID lookup
            data = await productsApi.getById(id);
          }
        }
        
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

  // Fetch reviews, stats, and can-review status
  useEffect(() => {
    async function fetchReviews() {
      if (!product?.id) return;
      setReviewsLoading(true);
      try {
        const [reviewsResponse, statsResponse, canReviewResponse] = await Promise.all([
          reviewsApi.getProductReviews(product.id, { page: reviewsPage, limit: 5, sort: reviewsSortBy }),
          reviewsApi.getProductStats(product.id),
          reviewsApi.canReview(product.id),
        ]);
        setReviews(reviewsResponse?.reviews || []);
        setReviewsTotalPages(reviewsResponse?.pagination?.totalPages || 1);
        setReviewStats(statsResponse || null);
        setCanReviewInfo(canReviewResponse || null);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [product?.id, reviewsPage, reviewsSortBy]);

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!product?.id) return;
    if (reviewFormData.content.trim().length < 10) {
      setReviewError('Opinia musi zawierać co najmniej 10 znaków');
      return;
    }
    
    setSubmittingReview(true);
    setReviewError('');
    try {
      await reviewsApi.create({
        productId: product.id,
        rating: reviewFormData.rating,
        title: reviewFormData.title || undefined,
        content: reviewFormData.content.trim(),
      });
      // Reset form and refresh reviews
      setReviewFormData({ rating: 5, title: '', content: '' });
      setShowReviewForm(false);
      // Refetch reviews
      const [reviewsResponse, statsResponse, canReviewResponse] = await Promise.all([
        reviewsApi.getProductReviews(product.id, { page: 1, limit: 5, sort: reviewsSortBy }),
        reviewsApi.getProductStats(product.id),
        reviewsApi.canReview(product.id),
      ]);
      setReviews(reviewsResponse?.reviews || []);
      setReviewsTotalPages(reviewsResponse?.pagination?.totalPages || 1);
      setReviewsPage(1);
      setReviewStats(statsResponse || null);
      setCanReviewInfo(canReviewResponse || null);
    } catch (error) {
      console.error('Failed to submit review:', error);
      setReviewError(error instanceof Error ? error.message : 'Nie udało się dodać opinii');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Mark review as helpful
  const handleMarkHelpful = async (reviewId: string, helpful: boolean) => {
    try {
      await reviewsApi.markHelpful(reviewId, helpful);
      // Update the review in local state
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, helpfulCount: helpful ? r.helpfulCount + 1 : r.helpfulCount, notHelpfulCount: !helpful ? r.notHelpfulCount + 1 : r.notHelpfulCount }
          : r
      ));
    } catch (error) {
      console.error('Failed to mark review:', error);
    }
  };

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
    
    // Check if description contains HTML tags
    const containsHtml = /<[a-z][\s\S]*>/i.test(description);
    
    if (containsHtml) {
      // If it's HTML content (from BaseLinker), return as-is
      return {
        mainDescription: description,
        features: [],
      };
    }
    
    // Otherwise parse as plain text with bullet points
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
  
  // Use variant price if available and > 0, otherwise fall back to product price
  const variantPrice = selectedVariant?.price ? Number(selectedVariant.price) : 0;
  const productPrice = Number(product.price) || 0;
  const effectivePrice = variantPrice > 0 ? variantPrice : productPrice;
  
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(effectivePrice);
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(effectivePrice) / Number(product.compareAtPrice)) * 100)
    : 0;

  // Use real category if available
  const categoryName = product.category?.name ? cleanCategoryName(product.category.name) : 'Produkty';
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
    // { id: 'parameters', label: 'Parametry' }, // Hidden
    // { id: 'reviews', label: 'Opinie' }, // Hidden
  ];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      
      <main className="container-custom py-3 sm:py-6 px-3 sm:px-4 overflow-hidden">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Main Product Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Left: Image Gallery */}
          <div className="md:col-span-1 lg:col-span-2 min-w-0">
            <div className="bg-white rounded-lg p-2 sm:p-4 relative overflow-hidden">
              {/* Badge */}
              {product.badge && (
                <span className="absolute top-3 left-3 sm:top-6 sm:left-6 bg-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded z-10 uppercase">
                  {product.badge}
                </span>
              )}
              
              {/* Main Image */}
              <div className="aspect-square overflow-hidden rounded-lg mb-3 sm:mb-4 max-w-full">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain max-w-full"
                />
              </div>

              {/* Thumbnail Gallery */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                {images?.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-md sm:rounded-lg overflow-hidden border-2 transition-colors ${
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
          <div className="md:col-span-1 lg:col-span-1 min-w-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 md:sticky md:top-24 overflow-hidden">
              {/* Title */}
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 leading-snug break-words">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4 hidden">
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
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-1">
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {Number(effectivePrice).toFixed(2).replace('.', ',')} zł
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm sm:text-lg text-gray-400 line-through">
                      {Number(product.compareAtPrice).toFixed(2).replace('.', ',')} zł
                    </span>
                    <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 rounded">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Lowest Price Info */}
              <p className="text-[11px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
                Najniższa cena w ostatnich 30 dniach: {Number(product.compareAtPrice || effectivePrice).toFixed(2).replace('.', ',')} zł
              </p>

              {/* Variants */}
              {product.variants?.length ? (
                <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
                  {variantAttributes.map((key) => (
                    <div key={key}>
                      <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
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
                    <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Ilość</label>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => clampQuantity(q - 1))}
                        disabled={quantity <= 1}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
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
                        className="w-16 sm:w-20 h-9 sm:h-10 text-center rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => clampQuantity(q + 1))}
                        disabled={!!selectedVariant && quantity >= selectedVariant.stock}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        aria-label="Zwiększ ilość"
                      >
                        +
                      </button>
                      {selectedVariant && (
                        <span className={`text-[10px] sm:text-xs ml-1 ${(selectedVariant.stock ?? 0) > 0 ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                          {(selectedVariant.stock ?? 0) > 0 
                            ? `Dostępne: ${selectedVariant.stock}` 
                            : 'Brak na stanie'}
                        </span>
                      )}
                    </div>
                    {variantAttributes.length > 0 && !selectedVariant && (
                      <p className="text-xs text-red-600 mt-1">Wybierz wariant produktu</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Error Message */}
              {cartError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs sm:text-sm">{cartError}</span>
                </div>
              )}

              {/* Out of Stock Banner */}
              {isOutOfStock && (
                <div className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Produkt chwilowo niedostępny</span>
                </div>
              )}

              {/* Buy Now Button */}
              {!isOutOfStock ? (
                <button 
                  onClick={handleBuyNow}
                  disabled={buyingNow || !selectedVariant}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 sm:py-3 rounded-lg mb-2 sm:mb-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {buyingNow ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Przekierowuję...
                    </>
                  ) : (
                    'Kup teraz'
                  )}
                </button>
              ) : (
                <button 
                  disabled
                  className="w-full bg-gray-400 text-white font-semibold py-3 rounded-lg mb-3 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Brak na stanie
                </button>
              )}

              {/* Add to Cart Button */}
              {!isOutOfStock ? (
                <button 
                  onClick={handleAddToCart}
                  disabled={addingToCart || !selectedVariant}
                  className="w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold py-2.5 sm:py-3 rounded-lg mb-3 sm:mb-4 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
              ) : (
                <button 
                  disabled
                  className="w-full border-2 border-gray-300 text-gray-400 font-semibold py-3 rounded-lg mb-4 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Powiadom o dostępności
                </button>
              )}

              {/* Stock Status */}
              {!isOutOfStock ? (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 mb-2 sm:mb-3">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">W magazynie: Wysyłka natychmiast</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-red-600 mb-2 sm:mb-3">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Produkt chwilowo niedostępny</span>
                </div>
              )}

              {/* Warehouse Location based on tags */}
              {(() => {
                const tags = product?.tags || [];
                let warehouseCity = '';
                
                if (tags.some(t => t.toLowerCase().includes('hurtownia przemysłowa'))) {
                  warehouseCity = 'Zielonej Górze';
                } else if (tags.some(t => t.toLowerCase() === 'ikonka')) {
                  warehouseCity = 'Białymstoku';
                } else if (tags.some(t => t.toLowerCase() === 'leker')) {
                  warehouseCity = 'Chynowie';
                } else if (tags.some(t => t.toLowerCase() === 'btp')) {
                  warehouseCity = 'Chotowie';
                }
                
                if (!warehouseCity) return null;
                
                return (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Produkt znajduje się w magazynie w {warehouseCity}</span>
                  </div>
                );
              })()}

              {/* Delivery Info */}
              
              <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              </div>

              {/* Seller Info */}
              <div className="border-t mt-4 pt-4 hidden">
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
                {/* Render HTML description from BaseLinker */}
                <div 
                  className="text-gray-600 mb-6 leading-relaxed prose prose-sm max-w-none
                    [&_p]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900
                    [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto
                    [&_.section]:mb-4 [&_.text-item]:mb-2"
                  dangerouslySetInnerHTML={{ __html: mainDescription || mockProduct.description || '' }}
                />

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
              <div className="max-w-4xl">
                {reviewsLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-4">Ładowanie opinii...</p>
                  </div>
                ) : (
                  <>
                    {/* Reviews Header with Stats */}
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                      {/* Stats Summary */}
                      <div className="flex-shrink-0">
                        <div className="text-center md:text-left">
                          <div className="text-5xl font-bold text-gray-900 mb-1">
                            {reviewStats?.averageRating?.toFixed(1) || '0.0'}
                          </div>
                          <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-5 h-5 ${star <= Math.round(reviewStats?.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500">
                            {reviewStats?.totalReviews || 0} {(reviewStats?.totalReviews || 0) === 1 ? 'opinia' : 'opinii'}
                          </p>
                        </div>
                      </div>

                      {/* Rating Distribution */}
                      {reviewStats && reviewStats.distribution && reviewStats.distribution.length > 0 && (
                        <div className="flex-grow">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const dist = reviewStats.distribution.find(d => d.rating === rating);
                            const count = dist?.count || 0;
                            const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                            return (
                              <div key={rating} className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-gray-600 w-12">{rating} gw.</span>
                                <div className="flex-grow bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-yellow-400 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-500 w-8">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add Review Button / Form */}
                    {canReviewInfo?.canReview && !showReviewForm && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="mb-6 bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                      >
                        Napisz opinię
                      </button>
                    )}

                    {showReviewForm && (
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Twoja opinia</h3>
                        
                        {/* Rating Selection */}
                        <div className="mb-4 hidden">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ocena</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewFormData(prev => ({ ...prev, rating: star }))}
                                className="focus:outline-none"
                              >
                                <svg
                                  className={`w-8 h-8 ${star <= reviewFormData.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title (optional) */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tytuł (opcjonalnie)</label>
                          <input
                            type="text"
                            value={reviewFormData.title}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Krótkie podsumowanie opinii"
                          />
                        </div>

                        {/* Content */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Treść opinii</label>
                          <textarea
                            value={reviewFormData.content}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, content: e.target.value }))}
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                            placeholder="Podziel się swoją opinią o produkcie (min. 10 znaków)"
                          />
                        </div>

                        {reviewError && (
                          <p className="text-red-500 text-sm mb-4">{reviewError}</p>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={handleSubmitReview}
                            disabled={submittingReview}
                            className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                          >
                            {submittingReview ? 'Wysyłanie...' : 'Dodaj opinię'}
                          </button>
                          <button
                            onClick={() => {
                              setShowReviewForm(false);
                              setReviewError('');
                            }}
                            className="text-gray-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sort and Filters */}
                    {reviews.length > 0 && (
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2">
                          <select
                            value={reviewsSortBy}
                            onChange={(e) => setReviewsSortBy(e.target.value as typeof reviewsSortBy)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="newest">Najnowsze</option>
                            <option value="oldest">Najstarsze</option>
                            <option value="highest">Najwyższa ocena</option>
                            <option value="lowest">Najniższa ocena</option>
                            <option value="helpful">Najbardziej pomocne</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Reviews List */}
                    {reviews.length > 0 ? (
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <svg
                                        key={star}
                                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                  {review.isVerifiedPurchase && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Zweryfikowany zakup
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {review.user.firstName} {review.user.lastName.charAt(0)}.
                                  <span className="text-gray-400 mx-2">•</span>
                                  {new Date(review.createdAt).toLocaleDateString('pl-PL')}
                                </p>
                              </div>
                            </div>

                            {review.title && (
                              <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                            )}
                            <p className="text-gray-700 mb-4">{review.content}</p>

                            {/* Review Images */}
                            {review.images && review.images.length > 0 && (
                              <div className="flex gap-2 mb-4">
                                {review.images.map((img) => (
                                  <img
                                    key={img.id}
                                    src={img.imageUrl}
                                    alt={img.altText || 'Review image'}
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}

                            {/* Helpful Buttons */}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Czy ta opinia była pomocna?</span>
                              <button
                                onClick={() => handleMarkHelpful(review.id, true)}
                                className="flex items-center gap-1 hover:text-green-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                Tak ({review.helpfulCount})
                              </button>
                              <button
                                onClick={() => handleMarkHelpful(review.id, false)}
                                className="flex items-center gap-1 hover:text-red-600 transition-colors"
                              >
                                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                Nie ({review.notHelpfulCount})
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Pagination */}
                        {reviewsTotalPages > 1 && (
                          <div className="flex justify-center gap-2 pt-6">
                            <button
                              onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                              disabled={reviewsPage === 1}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            >
                              Poprzednia
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-600">
                              Strona {reviewsPage} z {reviewsTotalPages}
                            </span>
                            <button
                              onClick={() => setReviewsPage(p => Math.min(reviewsTotalPages, p + 1))}
                              disabled={reviewsPage === reviewsTotalPages}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            >
                              Następna
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak opinii</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                          Ten produkt nie ma jeszcze żadnych opinii. Bądź pierwszą osobą, która podzieli się swoją opinią!
                        </p>
                        {!canReviewInfo?.canReview && (
                          <p className="text-sm text-gray-400">
                            Opinie mogą dodawać tylko klienci, którzy zakupili ten produkt.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
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