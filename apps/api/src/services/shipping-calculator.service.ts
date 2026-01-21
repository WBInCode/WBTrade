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
  WHOLESALER: /^(hurtownia[:\-_](.+)|Ikonka|BTP|HP|Gastro|Horeca|Hurtownia\s+Przemysłowa|Leker|Forcetop)$/i,
  // Matches paczkomat limit tags like "produkt w paczce: 3" or "3 produkty w paczce"
  PACZKOMAT_LIMIT: /^(?:produkt\s*w\s*paczce[:\s]*(\d+)|(\d+)\s*produkt(?:y|ów)?\s*w\s*paczce)$/i,
  // Matches tags that indicate courier-only delivery
  COURIER_ONLY: /^(tylko\s*kurier)$/i,
  // Matches tags that indicate paczkomat is available
  PACZKOMAT_AVAILABLE: /^(paczkomaty?\s*(i\s*kurier)?|paczkomat)$/i,
  // Matches tags that restrict shipping to InPost only (Paczkomat + Kurier InPost)
  INPOST_ONLY: /^paczkomaty?\s*i\s*kurier$/i,
  // Matches weight tags like "do 10 kg" or "do 31,5 kg"
  WEIGHT_KG: /^do\s*(\d+(?:[,\.]\d+)?)\s*kg$/i,
} as const;

// Shipping method prices (in PLN)
// Na ten moment tylko InPost + wysyłka gabaryt
export const SHIPPING_PRICES = {
  inpost_paczkomat: 15.99,
  inpost_kurier: 19.99,
  gabaryt_base: 49.99,
  wysylka_gabaryt: 79.99,
} as const;

// Weight-based shipping prices (brutto, zaokrąglone do .99)
export const WEIGHT_SHIPPING_PRICES = {
  2: 20.99,    // do 2 kg
  5: 22.99,    // do 5 kg
  10: 23.99,   // do 10 kg
  20: 25.99,   // do 20 kg
  31.5: 28.99, // do 31,5 kg
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
  weightShippingPrice?: number; // Price based on weight tag (e.g., "do 10 kg")
  productImage?: string;
}

export interface ShippingPackage {
  id: string;
  type: 'standard' | 'gabaryt';
  wholesaler: string | null;
  items: ShippingPackageItem[];
  paczkomatPackageCount: number;
  gabarytPrice?: number;
  weightShippingPrice?: number; // Highest weight-based price in this package
  isPaczkomatAvailable: boolean;
  isInPostOnly: boolean; // When true, only InPost Paczkomat and Kurier InPost are available
  isCourierOnly: boolean; // When true, only Kurier InPost is available (tag "Tylko kurier")
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
 * Check if product has gabaryt tag (oversized)
 * Tag format: "gabaryt" or "149.99 Gabaryt" (with price)
 * Gabaryt = only "Wysyłka gabaryt" option available
 */
function isGabaryt(tags: string[]): boolean {
  return tags.some(tag => TAG_PATTERNS.GABARYT.test(tag));
}

/**
 * Check if product has "Tylko kurier" tag
 * When true, only Kurier InPost is available (no paczkomat, no gabaryt)
 */
function isCourierOnly(tags: string[]): boolean {
  return tags.some(tag => TAG_PATTERNS.TYLKO_KURIER.test(tag));
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
 * Supports formats: "produkt w paczce: 3" or "3 produkty w paczce"
 */
function getPaczkomatLimit(tags: string[]): number {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.PACZKOMAT_LIMIT);
    if (match) {
      // match[1] is from "produkt w paczce: X" format
      // match[2] is from "X produkty w paczce" format
      const limit = parseInt(match[1] || match[2], 10);
      if (!isNaN(limit) && limit > 0) {
        return limit;
      }
    }
  }
  return 10; // Default limit
}

/**
 * Check if product has "Paczkomaty i Kurier" tag (InPost only)
 * When true, only InPost Paczkomat and Kurier InPost shipping methods are available
 */
function isInPostOnly(tags: string[]): boolean {
  return tags.some(tag => TAG_PATTERNS.INPOST_ONLY.test(tag));
}

/**
 * Get weight from product tags (e.g., "do 10 kg" returns 10)
 */
function getWeightKg(tags: string[]): number | null {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.WEIGHT_KG);
    if (match && match[1]) {
      // Replace comma with dot for parsing (e.g., "31,5" -> "31.5")
      const weight = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(weight) && weight > 0) {
        return weight;
      }
    }
  }
  return null;
}

/**
 * Get shipping price based on product weight
 * Returns the appropriate price tier based on weight tag
 */
function getWeightShippingPrice(tags: string[]): number | null {
  const weight = getWeightKg(tags);
  if (weight === null) return null;
  
  // Find the appropriate price tier
  const tiers = [2, 5, 10, 20, 31.5];
  for (const tier of tiers) {
    if (weight <= tier) {
      return WEIGHT_SHIPPING_PRICES[tier as keyof typeof WEIGHT_SHIPPING_PRICES];
    }
  }
  // If weight exceeds all tiers, return the highest tier price
  return WEIGHT_SHIPPING_PRICES[31.5];
}

/**
 * Check if product has weight tag (should use weight-based shipping)
 */
function hasWeightTag(tags: string[]): boolean {
  return tags.some(tag => TAG_PATTERNS.WEIGHT_KG.test(tag));
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
      const productIsInPostOnly = isInPostOnly(gabarytItem.product.tags);
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
          isInPostOnly: productIsInPostOnly,
          isCourierOnly: false, // Gabaryt has its own shipping method
        });
      }
    }
    
    // Create packages for standard items by wholesaler
    for (const [wholesaler, wholesalerItems] of standardItemsByWholesaler) {
      const packageItems = wholesalerItems.map(item => {
        const weightPrice = getWeightShippingPrice(item.product.tags);
        return {
          productId: item.product.id,
          productName: item.product.name,
          variantId: item.variantId,
          quantity: item.quantity,
          isGabaryt: false,
          weightShippingPrice: weightPrice || undefined,
          productImage: item.product.image,
        };
      });
      
      let paczkomatPackageCount = 0;
      // Check if any item in this package requires InPost only (Paczkomaty i Kurier)
      let packageIsInPostOnly = false;
      // Check if any item requires courier only (Tylko kurier)
      let packageIsCourierOnly = false;
      // Track highest weight-based shipping price in this package
      let maxWeightShippingPrice: number | null = null;
      
      for (const item of wholesalerItems) {
        const limit = getPaczkomatLimit(item.product.tags);
        const packagesForItem = Math.ceil(item.quantity / limit);
        paczkomatPackageCount += packagesForItem;
        
        // If any product has "Paczkomaty i Kurier" tag, the whole package is InPost only
        if (isInPostOnly(item.product.tags)) {
          packageIsInPostOnly = true;
        }
        
        // If any product has "Tylko kurier" tag, the whole package is courier only
        if (isCourierOnly(item.product.tags)) {
          packageIsCourierOnly = true;
        }
        
        // Track highest weight-based price (całość paczki płaci najwyższą cenę wagi)
        const weightPrice = getWeightShippingPrice(item.product.tags);
        if (weightPrice !== null) {
          if (maxWeightShippingPrice === null || weightPrice > maxWeightShippingPrice) {
            maxWeightShippingPrice = weightPrice;
          }
        }
      }
      
      // Paczkomat available only if NOT courier-only
      // "Paczkomaty i Kurier" = paczkomat available
      // "Tylko kurier" = paczkomat NOT available
      const isPaczkomatAvailableForPackage = !packageIsCourierOnly;
      
      packages.push({
        id: `standard-${packageId++}`,
        type: 'standard',
        wholesaler: wholesaler === 'default' ? null : wholesaler,
        items: packageItems,
        paczkomatPackageCount,
        weightShippingPrice: maxWeightShippingPrice || undefined,
        isPaczkomatAvailable: isPaczkomatAvailableForPackage,
        isInPostOnly: packageIsInPostOnly,
        isCourierOnly: packageIsCourierOnly,
      });
    }
    
    // Calculate costs
    const gabarytPackages = packages.filter(p => p.type === 'gabaryt');
    const standardPackages = packages.filter(p => p.type === 'standard');
    const gabarytPackageCount = gabarytPackages.length;
    const standardPackageCount = standardPackages.length;
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
    
    // Calculate standard packages cost - use weight-based price if available
    if (standardPackageCount > 0) {
      let standardCost = 0;
      let weightBasedCount = 0;
      let regularCount = 0;
      
      for (const pkg of standardPackages) {
        if (pkg.weightShippingPrice) {
          standardCost += pkg.weightShippingPrice;
          weightBasedCount++;
        } else {
          standardCost += SHIPPING_PRICES.inpost_kurier;
          regularCount++;
        }
      }
      
      if (weightBasedCount > 0 && regularCount > 0) {
        breakdown.push({
          description: `Standardowe paczki (${weightBasedCount} wg wagi, ${regularCount} standard)`,
          cost: standardCost,
          packageCount: standardPackageCount,
        });
      } else if (weightBasedCount > 0) {
        breakdown.push({
          description: `Paczki wg wagi (${weightBasedCount} hurtowni)`,
          cost: standardCost,
          packageCount: standardPackageCount,
        });
      } else {
        breakdown.push({
          description: `Standardowe paczki (${standardPackageCount} hurtowni)`,
          cost: standardCost,
          packageCount: standardPackageCount,
        });
      }
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
      case 'wysylka_gabaryt': return SHIPPING_PRICES.wysylka_gabaryt;
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
    
    // Calculate standard packages cost with weight-based pricing
    const standardPackages = calculation.packages.filter(p => p.type === 'standard');
    const totalStandardCost = standardPackages.reduce((sum, pkg) => {
      return sum + (pkg.weightShippingPrice || SHIPPING_PRICES.inpost_kurier);
    }, 0);
    
    // Check if any package has InPost only restriction (paczkomat i kurier tag)
    // isInPostOnly = true means ONLY InPost methods are available (paczkomat + kurier), NOT that paczkomat is disabled
    const hasInPostOnlyPackages = calculation.packages.some(p => p.isInPostOnly);
    
    // Paczkomat is not available only if there are gabaryt packages
    // "Paczkomaty i Kurier" tag means paczkomat IS available (just no other carriers)
    // "Tylko kurier" tag means paczkomat is NOT available
    const hasCourierOnlyPackages = calculation.packages.some(p => p.isCourierOnly);
    const isPaczkomatAvailable = calculation.isPaczkomatAvailable && !hasCourierOnlyPackages;
    
    let paczkomatMessage: string | undefined;
    if (!isPaczkomatAvailable) {
      if (hasCourierOnlyPackages) {
        paczkomatMessage = 'Produkt dostępny tylko z dostawą kurierem';
      } else {
        paczkomatMessage = 'Produkty gabarytowe wykluczają dostawę do paczkomatu';
      }
    } else if (calculation.totalPaczkomatPackages > 1) {
      paczkomatMessage = `${calculation.totalPaczkomatPackages} paczki`;
    }
    
    const methods = [
      {
        id: 'inpost_paczkomat',
        name: 'InPost Paczkomat',
        price: calculation.paczkomatCost,
        available: isPaczkomatAvailable,
        message: paczkomatMessage,
      },
      {
        id: 'inpost_kurier',
        name: 'Kurier InPost',
        price: totalGabarytCost + totalStandardCost,
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
      } else {
        // Standard packages
        const paczkomatPackages = pkg.paczkomatPackageCount;
        
        // Use weight-based price if available, otherwise standard price
        const courierPrice = pkg.weightShippingPrice || SHIPPING_PRICES.inpost_kurier;
        
        // Paczkomat available only if NOT courier-only (tag "Tylko kurier")
        const isPaczkomatAvailableForPackage = !pkg.isCourierOnly;
        
        methods.push({
          id: 'inpost_paczkomat',
          name: 'InPost Paczkomat',
          price: paczkomatPackages * SHIPPING_PRICES.inpost_paczkomat,
          available: isPaczkomatAvailableForPackage,
          message: !isPaczkomatAvailableForPackage 
            ? 'Produkt dostępny tylko z dostawą kurierem'
            : (paczkomatPackages > 1 ? `${paczkomatPackages} paczki` : undefined),
          estimatedDelivery: '1-2 dni',
        });
        methods.push({
          id: 'inpost_kurier',
          name: 'Kurier InPost',
          price: courierPrice,
          available: true,
          message: pkg.weightShippingPrice ? `Cena wg wagi: ${courierPrice.toFixed(2)} zł` : undefined,
          estimatedDelivery: '1-2 dni',
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
