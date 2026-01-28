'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Product, productsApi } from '../lib/api';

interface AddedProduct {
  name: string;
  image: string;
  price: string;
  quantity: number;
  productId?: string; // Added to fetch same warehouse products
}

interface SameWarehouseProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  variantId?: string;
}

interface AddToCartModalProps {
  isOpen: boolean;
  product: AddedProduct | null;
  onClose: () => void;
  onAddToCart?: (variantId: string, quantity: number, productInfo: AddedProduct) => Promise<void>;
}

export default function AddToCartModal({ isOpen, product, onClose, onAddToCart }: AddToCartModalProps) {
  const [sameWarehouseProducts, setSameWarehouseProducts] = useState<SameWarehouseProduct[]>([]);
  const [warehouseName, setWarehouseName] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Fetch same warehouse products when modal opens
  useEffect(() => {
    if (isOpen && product?.productId) {
      fetchSameWarehouseProducts(product.productId);
    } else {
      setSameWarehouseProducts([]);
      setWarehouseName(null);
    }
  }, [isOpen, product?.productId]);

  const fetchSameWarehouseProducts = async (productId: string) => {
    setLoadingProducts(true);
    try {
      const response = await productsApi.getSameWarehouseProducts(productId, { limit: 4 });
      const products = response.products.map((p: Product) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        image: p.images?.[0]?.url || '',
        variantId: p.variants?.[0]?.id,
      }));
      setSameWarehouseProducts(products);
      setWarehouseName(response.wholesaler);
    } catch (error) {
      console.error('Failed to fetch same warehouse products:', error);
      setSameWarehouseProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddSameWarehouseProduct = async (product: SameWarehouseProduct) => {
    if (!product.variantId || !onAddToCart) return;
    
    setAddingProductId(product.id);
    try {
      await onAddToCart(product.variantId, 1, {
        name: product.name,
        image: product.image,
        price: String(product.price),
        quantity: 1,
        productId: product.id,
      });
      // Remove from list after adding
      setSameWarehouseProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (error) {
      console.error('Failed to add product:', error);
    } finally {
      setAddingProductId(null);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen px-0 sm:px-4 pt-4 pb-0 sm:pb-20 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal - full width on mobile, centered on desktop */}
        <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg p-4 sm:p-6 text-left transform transition-all animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Success icon */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 text-center mb-3 sm:mb-4">
            Produkt dodany do koszyka!
          </h3>

          {/* Product info */}
          <div className="flex items-center gap-3 sm:gap-4 bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</p>
              <p className="text-xs text-gray-500 mt-1">Ilość: {product.quantity}</p>
              <p className="text-sm font-semibold text-primary-600 mt-1">{product.price} zł</p>
            </div>
          </div>

          {/* Same Warehouse Products - "Zamów w jednej przesyłce" */}
          {(loadingProducts || sameWarehouseProducts.length > 0) && (
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">Zamów w jednej przesyłce</p>
                  {warehouseName && (
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">z {warehouseName}</p>
                  )}
                </div>
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-lg p-3 animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {sameWarehouseProducts.map((p) => (
                    <div 
                      key={p.id} 
                      className="bg-gray-50 hover:bg-gray-100 rounded-lg p-2 sm:p-3 transition-colors group"
                    >
                      <Link href={`/products/${p.id}`} onClick={onClose}>
                        <div className="aspect-square bg-white rounded-lg overflow-hidden mb-1.5 sm:mb-2">
                          <img
                            src={p.image || '/placeholder.png'}
                            alt={p.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium text-gray-900 line-clamp-2 mb-1 min-h-[1.75rem] sm:min-h-[2rem]">
                          {p.name}
                        </p>
                      </Link>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 mb-1.5 sm:mb-2">
                        {p.price.toFixed(2)} zł
                      </p>
                      <button
                        onClick={() => handleAddSameWarehouseProduct(p)}
                        disabled={addingProductId === p.id || !p.variantId}
                        className="w-full py-1 sm:py-1.5 px-1.5 sm:px-2 text-[10px] sm:text-xs font-medium bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-md sm:rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1"
                      >
                        {addingProductId === p.id ? (
                          <>
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Dodaję...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Dodaj
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-gray-700 text-sm sm:text-base font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Kupuj dalej
            </button>
            <Link
              href="/cart"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-primary-500 hover:bg-primary-600 text-white text-sm sm:text-base rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Przejdź do koszyka
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
