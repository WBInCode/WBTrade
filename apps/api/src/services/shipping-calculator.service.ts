/**
 * Shipping Calculator Service
 * 
 * Calculates shipping costs based on product tags.
 * 
 * Rules:
 * 1. GABARYT (oversized) - Each oversized product requires individual shipping, costs are summed
 * 2. WYSYLKA_GABARYT - Forced shipping method for oversized products
 * 3. HURTOWNIA (wholesaler) - Products from different wholesalers are shipped separately
 * 4. Non-oversized from same wholesaler - Packed together as one shipment
 * 5. Paczkomat limits - Tags like "X produktów w paczce" define package limits
 * 6. Gabaryt + non-gabaryt - Two separate shipments (costs sum up)
 */

import { prisma } from '../db';

// Tag patterns for matching
const TAG_PATTERNS = {
  // Matches "gabaryt" or price-prefixed tags like "149.00 Gabaryt" or "249 gabaryt"
  GABARYT: /^((\d+(?:\.\d{2})?)\s*)?gabaryt$/i,
  // Matches "tylko kurier" tags
  TYLKO_KURIER: /^tylko\s*kurier$/i,
  // Matches wholesaler tags
  WHOLESALER: /^(hurtownia[:\-_](.+)|Ikonka|BTP|HP|Gastro|Horeca|Hurtownia\s+Przemysłowa)$/i,
  // Matches paczkomat limit tags like "1 produkt w paczce", "3 produkty w paczce"
  PACZKOMAT_LIMIT: /^(\d+)\s*produkt(?:y|ów)?\s*w\s*paczce$/i,
  // Matches tags that indicate courier-only delivery
  COURIER_ONLY: /^(tylko\s*kurier)$/i,
  // Matches tags that indicate paczkomat is available
  PACZKOMAT_AVAILABLE: /^(paczkomaty?\s*(i\s*kurier)?|paczkomat)$/i,
} as const;

// Shipping method prices (in PLN)
export const SHIPPING_PRICES = {
  inpost_paczkomat: 9.99,
  inpost_kurier: 19.99,
  dpd: 15.99,
  dhl: 19.99,
  gls: 13.99,
  pocztex: 12.99,
  fedex: 29.99,
  ups: 29.99,
  gabaryt_base: 49.99,
  wysylka_gabaryt: 79.99,
} as const;

export interface CartItemForShipping {
  variantId: string;
  quantity: number;
}

export interface ProductWithTags {
  id: string;
  name: string;
  tags: string[];
  image?: string;
}

export interface ShippingPackageItem {
  productId: string;
  productName: string;
  variantId: string;
  quantity: number;
  isGabaryt: boolean;
  gabarytPrice?: number;
  productImage?: string;
}

export interface ShippingPackage {
  id: string;
  type: 'standard' | 'gabaryt';
  wholesaler: string | null;
  items: ShippingPackageItem[];
  paczkomatPackageCount: number;
  gabarytPrice?: number;
  isPaczkomatAvailable: boolean;
}

export interface ShippingMethodForPackage {
  id: string;
  name: string;
  price: number;
  available: boolean;
  message?: string;
  estimatedDelivery: string;
}

export interface PackageWithShippingOptions {
  package: ShippingPackage;
  shippingMethods: ShippingMethodForPackage[];
  selectedMethod?: string;
}

export interface ShippingCalculationResult {
  packages: ShippingPackage[];
  totalPackages: number;
  totalPaczkomatPackages: number;
  shippingCost: number;
  paczkomatCost: number;
  breakdown: Array<{
    description: string;
    cost: number;
    packageCount: number;
  }>;
  warnings: string[];
  isPaczkomatAvailable: boolean;
}

/**
 * Check if product has gabaryt tag (oversized or courier-only)
 */
function isGabaryt(tags: string[]): boolean {
  return tags.some(tag => TAG_PATTERNS.GABARYT.test(tag) || TAG_PATTERNS.TYLKO_KURIER.test(tag));
}

/**
 * Get gabaryt shipping price from tag (e.g., "149.00 Gabaryt" returns 149)
 */
function getGabarytPrice(tags: string[]): number | null {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.GABARYT);
    if (match && match[2]) {
      const price = parseFloat(match[2]);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }
  return null;
}

/**
 * Get wholesaler from product tags
 */
function getWholesaler(tags: string[]): string | null {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.WHOLESALER);
    if (match) {
      return match[2] || match[1] || tag;
    }
  }
  return null;
}

/**
 * Get paczkomat limit from product tags
 */
function getPaczkomatLimit(tags: string[]): number {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.PACZKOMAT_LIMIT);
    if (match) {
      const limit = parseInt(match[1], 10);
      if (!isNaN(limit) && limit > 0) {
        return limit;
      }
    }
  }
  return 10; // Default limit
}

export class ShippingCalculatorService {
  /**
   * Calculate shipping for cart items
   */
  async calculateShipping(items: CartItemForShipping[]): Promise<ShippingCalculationResult> {
    const warnings: string[] = [];
    const packages: ShippingPackage[] = [];
    
    // Fetch products with tags and images
    const variantIds = items.map(item => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            tags: true,
            images: {
              take: 1,
              orderBy: { order: 'asc' },
              select: { url: true },
            },
          },
        },
      },
    });
    
    const variantToProduct = new Map<string, ProductWithTags & { image?: string }>();
    for (const variant of variants) {
      variantToProduct.set(variant.id, {
        id: variant.product.id,
        name: variant.product.name,
        tags: variant.product.tags,
        image: variant.product.images[0]?.url,
      });
    }
    
    // Check if any product has 'test' or 'testowy' tag - if yes, free shipping
    const hasTestProduct = Array.from(variantToProduct.values()).some(product => 
      product.tags.some(tag => tag.toLowerCase() === 'test' || tag.toLowerCase() === 'testowy')
    );
    
    if (hasTestProduct) {
      warnings.push('🎁 DARMOWA DOSTAWA - Produkt testowy');
      return {
        packages: [{
          id: 'test-1',
          type: 'standard',
          wholesaler: null,
          items: items.map(item => {
            const product = variantToProduct.get(item.variantId)!;
            return {
              productId: product.id,
              productName: product.name,
              variantId: item.variantId,
              quantity: item.quantity,
              isGabaryt: false,
              productImage: product.image,
            };
          }),
          paczkomatPackageCount: 1,
          isPaczkomatAvailable: true,
        }],
        totalPackages: 1,
        totalPaczkomatPackages: 1,
        shippingCost: 0,
        paczkomatCost: 0,
        breakdown: [{
          description: 'Darmowa dostawa - Produkt testowy',
          cost: 0,
          packageCount: 1,
        }],
        warnings,
        isPaczkomatAvailable: true,
      };
    }
    
    // Categorize items
    const gabarytItems: Array<{ product: ProductWithTags; variantId: string; quantity: number }> = [];
    const standardItemsByWholesaler = new Map<string, Array<{ product: ProductWithTags; variantId: string; quantity: number }>>();
    
    for (const item of items) {
      const product = variantToProduct.get(item.variantId);
      if (!product) {
        warnings.push(`Nie znaleziono produktu dla wariantu ${item.variantId}`);
        continue;
      }
      
      const tags = product.tags || [];
      const productIsGabaryt = isGabaryt(tags);
      const wholesaler = getWholesaler(tags) || 'default';
      
      if (productIsGabaryt) {
        gabarytItems.push({ product, variantId: item.variantId, quantity: item.quantity });
      } else {
        if (!standardItemsByWholesaler.has(wholesaler)) {
          standardItemsByWholesaler.set(wholesaler, []);
        }
        standardItemsByWholesaler.get(wholesaler)!.push({
          product,
          variantId: item.variantId,
          quantity: item.quantity,
        });
      }
    }
    
    // Create packages for gabaryt items (each one is a separate shipment)
    let packageId = 1;
    for (const gabarytItem of gabarytItems) {
      const gabarytPrice = getGabarytPrice(gabarytItem.product.tags);
      for (let i = 0; i < gabarytItem.quantity; i++) {
        packages.push({
          id: `gabaryt-${packageId++}`,
          type: 'gabaryt',
          wholesaler: getWholesaler(gabarytItem.product.tags) || null,
          items: [{
            productId: gabarytItem.product.id,
            productName: gabarytItem.product.name,
            variantId: gabarytItem.variantId,
            quantity: 1,
            isGabaryt: true,
            gabarytPrice: gabarytPrice || undefined,
            productImage: gabarytItem.product.image,
          }],
          paczkomatPackageCount: 0,
          gabarytPrice: gabarytPrice || SHIPPING_PRICES.gabaryt_base,
          isPaczkomatAvailable: false, // Gabaryt cannot use paczkomat
        });
      }
    }
    
    // Create packages for standard items by wholesaler
    for (const [wholesaler, wholesalerItems] of standardItemsByWholesaler) {
      const packageItems = wholesalerItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        variantId: item.variantId,
        quantity: item.quantity,
        isGabaryt: false,
        productImage: item.product.image,
      }));
      
      let paczkomatPackageCount = 0;
      for (const item of wholesalerItems) {
        const limit = getPaczkomatLimit(item.product.tags);
        const packagesForItem = Math.ceil(item.quantity / limit);
        paczkomatPackageCount += packagesForItem;
      }
      
      packages.push({
        id: `standard-${packageId++}`,
        type: 'standard',
        wholesaler: wholesaler === 'default' ? null : wholesaler,
        items: packageItems,
        paczkomatPackageCount,
        isPaczkomatAvailable: true, // Standard items can use paczkomat
      });
    }
    
    // Calculate costs
    const gabarytPackages = packages.filter(p => p.type === 'gabaryt');
    const gabarytPackageCount = gabarytPackages.length;
    const standardPackageCount = packages.filter(p => p.type === 'standard').length;
    const totalPackages = gabarytPackageCount + standardPackageCount;
    const totalPaczkomatPackages = packages.reduce((sum, p) => sum + p.paczkomatPackageCount, 0);
    const isPaczkomatAvailable = gabarytPackageCount === 0;
    
    const breakdown: Array<{ description: string; cost: number; packageCount: number }> = [];
    
    // Sum gabaryt costs from individual prices
    const totalGabarytCost = gabarytPackages.reduce((sum, pkg) => sum + (pkg.gabarytPrice || SHIPPING_PRICES.gabaryt_base), 0);
    
    if (gabarytPackageCount > 0) {
      breakdown.push({
        description: `Produkty gabarytowe (${gabarytPackageCount} szt.)`,
        cost: totalGabarytCost,
        packageCount: gabarytPackageCount,
      });
    }
    
    if (standardPackageCount > 0) {
      const standardCost = standardPackageCount * SHIPPING_PRICES.inpost_kurier;
      breakdown.push({
        description: `Standardowe paczki (${standardPackageCount} hurtowni)`,
        cost: standardCost,
        packageCount: standardPackageCount,
      });
    }
    
    const shippingCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
    const paczkomatCost = isPaczkomatAvailable ? totalPaczkomatPackages * SHIPPING_PRICES.inpost_paczkomat : 0;
    
    if (!isPaczkomatAvailable) {
      warnings.push('Produkty gabarytowe nie mogą być wysłane do paczkomatu. Dostępna tylko dostawa kurierem.');
    }
    
    return {
      packages,
      totalPackages,
      totalPaczkomatPackages,
      shippingCost,
      paczkomatCost,
      breakdown,
      warnings,
      isPaczkomatAvailable,
    };
  }
  
  /**
   * Get base shipping price for method
   */
  private getBaseShippingPrice(method: string): number {
    switch (method) {
      case 'inpost_paczkomat': return SHIPPING_PRICES.inpost_paczkomat;
      case 'inpost_kurier': return SHIPPING_PRICES.inpost_kurier;
      case 'dpd': return SHIPPING_PRICES.dpd;
      case 'dhl': return SHIPPING_PRICES.dhl;
      case 'gls': return SHIPPING_PRICES.gls;
      case 'pocztex': return SHIPPING_PRICES.pocztex;
      default: return SHIPPING_PRICES.inpost_kurier;
    }
  }
  
  /**
   * Get available shipping methods for cart items
   */
  async getAvailableShippingMethods(items: CartItemForShipping[]): Promise<Array<{
    id: string;
    name: string;
    price: number;
    available: boolean;
    message?: string;
  }>> {
    const calculation = await this.calculateShipping(items);
    
    // Get total gabaryt cost from individual package prices
    const totalGabarytCost = calculation.packages
      .filter(p => p.type === 'gabaryt')
      .reduce((sum, pkg) => sum + (pkg.gabarytPrice || SHIPPING_PRICES.gabaryt_base), 0);
    
    const standardPackageCount = calculation.packages.filter(p => p.type === 'standard').length;
    
    const methods = [
      {
        id: 'inpost_paczkomat',
        name: 'InPost Paczkomat',
        price: calculation.paczkomatCost,
        available: calculation.isPaczkomatAvailable,
        message: calculation.isPaczkomatAvailable 
          ? (calculation.totalPaczkomatPackages > 1 ? `${calculation.totalPaczkomatPackages} paczki` : undefined)
          : 'Produkty gabarytowe wykluczają dostawę do paczkomatu',
      },
      {
        id: 'inpost_kurier',
        name: 'Kurier InPost',
        price: totalGabarytCost + (standardPackageCount * SHIPPING_PRICES.inpost_kurier),
        available: true,
      },
      {
        id: 'dpd',
        name: 'Kurier DPD',
        price: totalGabarytCost + (standardPackageCount * SHIPPING_PRICES.dpd),
        available: true,
      },
      {
        id: 'pocztex',
        name: 'Pocztex Kurier48',
        price: totalGabarytCost + (standardPackageCount * SHIPPING_PRICES.pocztex),
        available: true,
      },
      {
        id: 'dhl',
        name: 'Kurier DHL',
        price: totalGabarytCost + (standardPackageCount * SHIPPING_PRICES.dhl),
        available: true,
      },
      {
        id: 'gls',
        name: 'Kurier GLS',
        price: totalGabarytCost + (standardPackageCount * SHIPPING_PRICES.gls),
        available: true,
      },
    ];
    
    // Jeśli są produkty gabarytowe, dodaj wymuszoną opcję "Wysyłka gabaryt"
    const hasGabarytPackages = calculation.packages.some(p => p.type === 'gabaryt');
    if (hasGabarytPackages) {
      methods.unshift({
        id: 'wysylka_gabaryt',
        name: 'Wysyłka gabaryt',
        price: totalGabarytCost || SHIPPING_PRICES.wysylka_gabaryt,
        available: true,
        message: 'Wymagana dla produktów gabarytowych',
        forced: true, // Ta opcja jest wymuszona i nie może być zmieniona
      } as any);
    }
    
    return methods;
  }
  
  /**
   * Get shipping options per package (for per-product shipping selection)
   * Each package gets its own list of available shipping methods
   */
  async getShippingOptionsPerPackage(items: CartItemForShipping[]): Promise<{
    packagesWithOptions: PackageWithShippingOptions[];
    totalShippingCost: number;
    warnings: string[];
  }> {
    const calculation = await this.calculateShipping(items);
    const packagesWithOptions: PackageWithShippingOptions[] = [];
    
    for (const pkg of calculation.packages) {
      const methods: ShippingMethodForPackage[] = [];
      
      if (pkg.type === 'gabaryt') {
        // Gabaryt packages - wymuszona opcja "Wysyłka gabaryt" + inne kurierskie
        const gabarytPrice = pkg.gabarytPrice || SHIPPING_PRICES.gabaryt_base;
        
        // Dodaj wymuszoną opcję "Wysyłka gabaryt" na początek
        methods.push({
          id: 'wysylka_gabaryt',
          name: 'Wysyłka gabaryt',
          price: gabarytPrice,
          available: true,
          message: 'Wymagana dla produktów gabarytowych',
          estimatedDelivery: '2-5 dni roboczych',
        });
        
        methods.push({
          id: 'inpost_paczkomat',
          name: 'InPost Paczkomat',
          price: 0,
          available: false,
          message: 'Produkt gabarytowy - tylko kurier',
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'inpost_kurier',
          name: 'Kurier InPost',
          price: gabarytPrice,
          available: false,
          message: 'Wymagana wysyłka gabaryt',
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'dpd',
          name: 'Kurier DPD',
          price: gabarytPrice,
          available: false,
          message: 'Wymagana wysyłka gabaryt',
          estimatedDelivery: '1-3 dni',
        });
        methods.push({
          id: 'pocztex',
          name: 'Pocztex Kurier48',
          price: gabarytPrice,
          available: false,
          message: 'Wymagana wysyłka gabaryt',
          estimatedDelivery: '2-3 dni',
        });
        methods.push({
          id: 'dhl',
          name: 'Kurier DHL',
          price: gabarytPrice,
          available: false,
          message: 'Wymagana wysyłka gabaryt',
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'gls',
          name: 'Kurier GLS',
          price: gabarytPrice,
          available: false,
          estimatedDelivery: '2-4 dni',
        });
      } else {
        // Standard packages - all options available
        const paczkomatPackages = pkg.paczkomatPackageCount;
        
        methods.push({
          id: 'inpost_paczkomat',
          name: 'InPost Paczkomat',
          price: paczkomatPackages * SHIPPING_PRICES.inpost_paczkomat,
          available: true,
          message: paczkomatPackages > 1 ? `${paczkomatPackages} paczki` : undefined,
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'inpost_kurier',
          name: 'Kurier InPost',
          price: SHIPPING_PRICES.inpost_kurier,
          available: true,
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'dpd',
          name: 'Kurier DPD',
          price: SHIPPING_PRICES.dpd,
          available: true,
          estimatedDelivery: '1-3 dni',
        });
        methods.push({
          id: 'pocztex',
          name: 'Pocztex Kurier48',
          price: SHIPPING_PRICES.pocztex,
          available: true,
          estimatedDelivery: '2-3 dni',
        });
        methods.push({
          id: 'dhl',
          name: 'Kurier DHL',
          price: SHIPPING_PRICES.dhl,
          available: true,
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'gls',
          name: 'Kurier GLS',
          price: SHIPPING_PRICES.gls,
          available: true,
          estimatedDelivery: '2-4 dni',
        });
      }
      
      // Set default selected method
      // Dla paczek gabarytowych - wymuszona wysyłka gabaryt
      // Dla standardowych - paczkomat jeśli dostępny, w przeciwnym razie kurier
      const defaultMethod = pkg.type === 'gabaryt' 
        ? 'wysylka_gabaryt' 
        : (pkg.isPaczkomatAvailable ? 'inpost_paczkomat' : 'inpost_kurier');
      
      packagesWithOptions.push({
        package: pkg,
        shippingMethods: methods,
        selectedMethod: defaultMethod,
      });
    }
    
    // Calculate initial total with default methods
    let totalShippingCost = 0;
    for (const pkgOpt of packagesWithOptions) {
      const selectedMethod = pkgOpt.shippingMethods.find(m => m.id === pkgOpt.selectedMethod && m.available);
      if (selectedMethod) {
        totalShippingCost += selectedMethod.price;
      }
    }
    
    return {
      packagesWithOptions,
      totalShippingCost,
      warnings: calculation.warnings,
    };
  }
}

export const shippingCalculatorService = new ShippingCalculatorService();
