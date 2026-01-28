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
export const SHIPPING_PRICES = {
  inpost_paczkomat: 15.99,
  inpost_kurier: 19.99,
  dpd_kurier: 19.99, // DPD Kurier price
  gabaryt_base: 49.99,
  wysylka_gabaryt: 79.99,
} as const;

// Weight-based shipping prices for "Tylko kurier" products (brutto)
// Wszystkie wagi do 20 kg włącznie = 25.99 zł
// Waga do 31.5 kg = 28.99 zł
export const WEIGHT_SHIPPING_PRICES = {
  2: 25.99,    // do 2 kg
  5: 25.99,    // do 5 kg
  10: 25.99,   // do 10 kg
  20: 25.99,   // do 20 kg
  31.5: 28.99, // do 31,5 kg
} as const;

// Free shipping threshold per warehouse (in PLN)
export const FREE_SHIPPING_THRESHOLD = 300;

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
  tags?: string[]; // Product tags for paczkomat limit calculation
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
  isInPostOnly: boolean; // When true, only InPost (Paczkomat + Kurier InPost) - no DPD
  isCourierOnly: boolean; // When true, only DPD Kurier - no InPost (tag "Tylko kurier")
  warehouseValue: number; // Total value of products from this warehouse
  hasFreeShipping: boolean; // True if warehouse value >= FREE_SHIPPING_THRESHOLD
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
 * When true, only DPD Kurier is available (no InPost paczkomat, no InPost kurier)
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
  return 1; // Default: each product = 1 package (safest assumption)
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
    
    // Fetch products with tags, images, and prices
    const variantIds = items.map(item => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            tags: true,
            price: true,
            images: {
              take: 1,
              orderBy: { order: 'asc' },
              select: { url: true },
            },
          },
        },
      },
    });
    
    const variantToProduct = new Map<string, ProductWithTags & { image?: string; price: number }>();
    for (const variant of variants) {
      variantToProduct.set(variant.id, {
        id: variant.product.id,
        name: variant.product.name,
        tags: variant.product.tags,
        image: variant.product.images[0]?.url,
        price: Number(variant.product.price) || 0,
      });
    }
    
    // Categorize items
    const gabarytItems: Array<{ product: ProductWithTags & { price: number }; variantId: string; quantity: number }> = [];
    // Group by wholesaler only - shipping restrictions will be determined per package
    const standardItemsByWholesaler = new Map<string, Array<{ product: ProductWithTags & { price: number }; variantId: string; quantity: number }>>();
    
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
    
    // Calculate total value per warehouse (for free shipping calculation)
    // Includes both gabaryt and standard items
    const valueByWholesaler = new Map<string, number>();
    
    for (const item of gabarytItems) {
      const wholesaler = getWholesaler(item.product.tags) || 'default';
      const itemValue = item.product.price * item.quantity;
      const currentValue = valueByWholesaler.get(wholesaler) || 0;
      valueByWholesaler.set(wholesaler, currentValue + itemValue);
    }
    
    for (const [wholesaler, groupItems] of standardItemsByWholesaler) {
      let totalValue = 0;
      for (const item of groupItems) {
        totalValue += item.product.price * item.quantity;
      }
      const currentValue = valueByWholesaler.get(wholesaler) || 0;
      valueByWholesaler.set(wholesaler, currentValue + totalValue);
    }
    
    // Create packages for gabaryt items (each one is a separate shipment)
    let packageId = 1;
    for (const gabarytItem of gabarytItems) {
      const gabarytPrice = getGabarytPrice(gabarytItem.product.tags);
      const productIsInPostOnly = isInPostOnly(gabarytItem.product.tags);
      const wholesaler = getWholesaler(gabarytItem.product.tags) || 'default';
      const warehouseValue = valueByWholesaler.get(wholesaler) || 0;
      const hasFreeShipping = warehouseValue >= FREE_SHIPPING_THRESHOLD;
      
      for (let i = 0; i < gabarytItem.quantity; i++) {
        packages.push({
          id: `gabaryt-${packageId++}`,
          type: 'gabaryt',
          wholesaler: wholesaler === 'default' ? null : wholesaler,
          items: [{
            productId: gabarytItem.product.id,
            productName: gabarytItem.product.name,
            variantId: gabarytItem.variantId,
            quantity: 1,
            isGabaryt: true,
            gabarytPrice: gabarytPrice || undefined,
            productImage: gabarytItem.product.image,
            tags: gabarytItem.product.tags || [],
          }],
          paczkomatPackageCount: 0,
          gabarytPrice: gabarytPrice || SHIPPING_PRICES.gabaryt_base,
          isPaczkomatAvailable: false, // Gabaryt cannot use paczkomat
          isInPostOnly: productIsInPostOnly,
          isCourierOnly: false, // Gabaryt has its own shipping method
          warehouseValue,
          hasFreeShipping,
        });
      }
    }
    
    // Create packages for standard items by wholesaler
    // Shipping restrictions are determined by the most restrictive product in the package
    for (const [wholesaler, groupItems] of standardItemsByWholesaler) {
      // Determine shipping restrictions for the whole package
      // Priority: dpd_only > inpost_only > all
      // If ANY product requires "tylko kurier", the whole package is dpd_only
      // If ANY product is "inpost_only" (and no dpd_only), the whole package is inpost_only
      let packageIsCourierOnly = false;
      let packageIsInPostOnly = false;
      
      for (const item of groupItems) {
        const tags = item.product.tags || [];
        if (isCourierOnly(tags)) {
          packageIsCourierOnly = true;
          break; // Most restrictive, no need to check further
        }
        if (isInPostOnly(tags)) {
          packageIsInPostOnly = true;
        }
      }
      
      // If courier only, disable InPost-only flag
      if (packageIsCourierOnly) {
        packageIsInPostOnly = false;
      }
      
      const packageItems = groupItems.map(item => {
        const weightPrice = getWeightShippingPrice(item.product.tags);
        return {
          productId: item.product.id,
          productName: item.product.name,
          variantId: item.variantId,
          quantity: item.quantity,
          isGabaryt: false,
          weightShippingPrice: weightPrice || undefined,
          productImage: item.product.image,
          tags: item.product.tags || [], // Include tags for package distribution
        };
      });
      
      // Calculate how many packages are needed for this shipment
      // NEW FRACTIONAL LOGIC:
      // Tag "produkt w paczce: N" means 1 item takes 1/N of package capacity
      // Package capacity = 1.0
      // Sum all fractions, then ceil() = number of packages needed
      //
      // Examples:
      //   - 1x(paczka:3) + 2x(paczka:4) = 1/3 + 2/4 = 0.333 + 0.5 = 0.833 → 1 package
      //   - 2x(paczka:3) + 2x(paczka:4) = 2/3 + 2/4 = 0.667 + 0.5 = 1.167 → 2 packages
      //   - 3x(paczka:1) = 3/1 = 3.0 → 3 packages (each item is separate)
      
      let totalFraction = 0;
      for (const item of groupItems) {
        const limit = getPaczkomatLimit(item.product.tags);
        // Each item takes 1/limit of package capacity
        const fractionPerItem = 1 / limit;
        totalFraction += fractionPerItem * item.quantity;
      }
      
      // Number of packages = ceil of total fraction
      const paczkomatPackageCount = Math.ceil(totalFraction);
      
      // Track highest weight-based shipping price in this package
      let maxWeightShippingPrice: number | null = null;
      
      for (const item of groupItems) {
        const weightPrice = getWeightShippingPrice(item.product.tags);
        if (weightPrice !== null) {
          if (maxWeightShippingPrice === null || weightPrice > maxWeightShippingPrice) {
            maxWeightShippingPrice = weightPrice;
          }
        }
      }
      
      // Paczkomat available only if NOT courier-only (DPD only)
      const isPaczkomatAvailableForPackage = !packageIsCourierOnly;
      
      // Calculate warehouse value and check for free shipping
      const warehouseValue = valueByWholesaler.get(wholesaler) || 0;
      const hasFreeShipping = warehouseValue >= FREE_SHIPPING_THRESHOLD;
      
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
        warehouseValue,
        hasFreeShipping,
      });
    }
    
    // Calculate costs (considering free shipping)
    const gabarytPackages = packages.filter(p => p.type === 'gabaryt');
    const standardPackages = packages.filter(p => p.type === 'standard');
    const gabarytPackageCount = gabarytPackages.length;
    const standardPackageCount = standardPackages.length;
    const totalPackages = gabarytPackageCount + standardPackageCount;
    const totalPaczkomatPackages = packages.reduce((sum, p) => sum + p.paczkomatPackageCount, 0);
    const isPaczkomatAvailable = gabarytPackageCount === 0;
    
    const breakdown: Array<{ description: string; cost: number; packageCount: number }> = [];
    
    // Sum gabaryt costs from individual prices (considering free shipping)
    const totalGabarytCost = gabarytPackages.reduce((sum, pkg) => {
      if (pkg.hasFreeShipping) return sum; // Free shipping for this warehouse
      return sum + (pkg.gabarytPrice || SHIPPING_PRICES.gabaryt_base);
    }, 0);
    
    const freeGabarytCount = gabarytPackages.filter(p => p.hasFreeShipping).length;
    const paidGabarytCount = gabarytPackageCount - freeGabarytCount;
    
    if (gabarytPackageCount > 0) {
      if (freeGabarytCount > 0 && paidGabarytCount > 0) {
        breakdown.push({
          description: `Produkty gabarytowe (${paidGabarytCount} płatne, ${freeGabarytCount} darmowe)`,
          cost: totalGabarytCost,
          packageCount: gabarytPackageCount,
        });
      } else if (freeGabarytCount > 0) {
        breakdown.push({
          description: `Produkty gabarytowe (${gabarytPackageCount} szt.) - DARMOWA DOSTAWA`,
          cost: 0,
          packageCount: gabarytPackageCount,
        });
      } else {
        breakdown.push({
          description: `Produkty gabarytowe (${gabarytPackageCount} szt.)`,
          cost: totalGabarytCost,
          packageCount: gabarytPackageCount,
        });
      }
    }
    
    // Calculate standard packages cost - use weight-based price if available (considering free shipping)
    if (standardPackageCount > 0) {
      let standardCost = 0;
      let weightBasedCount = 0;
      let regularCount = 0;
      let freeCount = 0;
      
      for (const pkg of standardPackages) {
        if (pkg.hasFreeShipping) {
          freeCount++;
          continue; // Skip cost for free shipping packages
        }
        if (pkg.weightShippingPrice) {
          standardCost += pkg.weightShippingPrice;
          weightBasedCount++;
        } else {
          standardCost += SHIPPING_PRICES.inpost_kurier;
          regularCount++;
        }
      }
      
      let description = '';
      if (freeCount > 0) {
        if (freeCount === standardPackageCount) {
          description = `Standardowe paczki (${standardPackageCount}) - DARMOWA DOSTAWA`;
        } else {
          const paidCount = standardPackageCount - freeCount;
          description = `Standardowe paczki (${paidCount} płatne, ${freeCount} darmowe)`;
        }
      } else if (weightBasedCount > 0 && regularCount > 0) {
        description = `Standardowe paczki (${weightBasedCount} wg wagi, ${regularCount} standard)`;
      } else if (weightBasedCount > 0) {
        description = `Paczki wg wagi (${weightBasedCount} hurtowni)`;
      } else {
        description = `Standardowe paczki (${standardPackageCount} hurtowni)`;
      }
      
      breakdown.push({
        description,
        cost: standardCost,
        packageCount: standardPackageCount,
      });
    }
    
    const shippingCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
    
    // Calculate paczkomat cost (considering free shipping)
    let paczkomatCost = 0;
    if (isPaczkomatAvailable) {
      for (const pkg of standardPackages) {
        if (!pkg.hasFreeShipping) {
          paczkomatCost += pkg.paczkomatPackageCount * SHIPPING_PRICES.inpost_paczkomat;
        }
      }
    }
    
    if (!isPaczkomatAvailable) {
      warnings.push('Produkty gabarytowe nie mogą być wysłane do paczkomatu. Dostępna tylko dostawa kurierem.');
    }
    
    // Add info about free shipping
    const freeShippingWarehouses = [...new Set(packages.filter(p => p.hasFreeShipping).map(p => p.wholesaler).filter(Boolean))];
    if (freeShippingWarehouses.length > 0) {
      warnings.push(`Darmowa dostawa dla zamówień powyżej ${FREE_SHIPPING_THRESHOLD} zł z: ${freeShippingWarehouses.join(', ')}`);
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
    
    // Get total gabaryt cost from individual package prices (considering free shipping)
    const totalGabarytCost = calculation.packages
      .filter(p => p.type === 'gabaryt')
      .reduce((sum, pkg) => {
        if (pkg.hasFreeShipping) return sum;
        return sum + (pkg.gabarytPrice || SHIPPING_PRICES.gabaryt_base);
      }, 0);
    
    // Calculate standard packages cost with weight-based pricing (considering free shipping)
    const standardPackages = calculation.packages.filter(p => p.type === 'standard');
    const totalStandardCost = standardPackages.reduce((sum, pkg) => {
      if (pkg.hasFreeShipping) return sum;
      return sum + (pkg.weightShippingPrice || SHIPPING_PRICES.inpost_kurier);
    }, 0);
    
    // Calculate InPost kurier cost (considering free shipping)
    let inpostKurierCost = totalGabarytCost;
    for (const pkg of standardPackages) {
      if (!pkg.hasFreeShipping) {
        inpostKurierCost += pkg.paczkomatPackageCount * SHIPPING_PRICES.inpost_kurier;
      }
    }
    
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
        message: calculation.paczkomatCost === 0 && isPaczkomatAvailable ? 'Darmowa dostawa!' : paczkomatMessage,
      },
      {
        id: 'inpost_kurier',
        name: 'Kurier InPost',
        price: inpostKurierCost,
        available: true,
        message: inpostKurierCost === 0 
          ? 'Darmowa dostawa!' 
          : (calculation.totalPaczkomatPackages > 1 ? `${calculation.totalPaczkomatPackages} paczki` : undefined),
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
   * If paczkomatPackageCount > 1, creates multiple shipments for paczkomat option
   */
  async getShippingOptionsPerPackage(items: CartItemForShipping[]): Promise<{
    packagesWithOptions: PackageWithShippingOptions[];
    totalShippingCost: number;
    minShippingCost: number;
    warnings: string[];
  }> {
    const calculation = await this.calculateShipping(items);
    const packagesWithOptions: PackageWithShippingOptions[] = [];
    
    for (const pkg of calculation.packages) {
      const isFree = pkg.hasFreeShipping;
      
      if (pkg.type === 'gabaryt') {
        // Gabaryt packages - wymuszona opcja "Wysyłka gabaryt" + inne kurierskie
        const gabarytPrice = isFree ? 0 : (pkg.gabarytPrice || SHIPPING_PRICES.gabaryt_base);
        
        const methods: ShippingMethodForPackage[] = [
          {
            id: 'wysylka_gabaryt',
            name: 'Wysyłka gabaryt',
            price: gabarytPrice,
            available: true,
            message: isFree 
              ? `Darmowa dostawa! (zamówienie powyżej ${FREE_SHIPPING_THRESHOLD} zł)` 
              : 'Wymagana dla produktów gabarytowych',
            estimatedDelivery: '2-5 dni roboczych',
          },
          {
            id: 'inpost_paczkomat',
            name: 'InPost Paczkomat',
            price: 0,
            available: false,
            message: 'Produkt gabarytowy - tylko kurier',
            estimatedDelivery: '1-2 dni',
          },
          {
            id: 'inpost_kurier',
            name: 'Kurier InPost',
            price: gabarytPrice,
            available: false,
            message: 'Wymagana wysyłka gabaryt',
            estimatedDelivery: '1-2 dni',
          },
        ];
        
        packagesWithOptions.push({
          package: pkg,
          shippingMethods: methods,
          selectedMethod: 'wysylka_gabaryt',
        });
      } else {
        // Standard packages
        const paczkomatPackages = pkg.paczkomatPackageCount;
        
        // Use weight-based price if available, otherwise standard price
        const dpdPrice = isFree ? 0 : (pkg.weightShippingPrice || SHIPPING_PRICES.dpd_kurier);
        
        const isInPostAvailable = !pkg.isCourierOnly;
        const isDpdAvailable = !pkg.isInPostOnly;
        
        const freeMessage = isFree ? `Darmowa dostawa! (zamówienie powyżej ${FREE_SHIPPING_THRESHOLD} zł)` : undefined;
        
        // If paczkomatPackageCount > 1, we need to create multiple shipments for paczkomat
        // Each shipment = 1 paczkomat package with its own price
        // Courier options are shown separately at the end (one courier takes everything)
        if (paczkomatPackages > 1 && isInPostAvailable) {
          // Distribute items across paczkomat packages based on their fractions
          // Each package has capacity = 1.0
          // We fill packages until they're full (capacity >= 1.0)
          
          const itemsWithFractions = pkg.items.map(item => {
            // Find the original product to get tags and calculate fraction
            const limit = getPaczkomatLimit(item.tags || []);
            const fractionPerItem = 1 / limit;
            return {
              ...item,
              fractionPerItem,
              remainingQty: item.quantity,
            };
          });
          
          const distributedPackages: Array<typeof pkg.items> = [];
          
          // Fill packages one by one
          for (let packageIndex = 0; packageIndex < paczkomatPackages; packageIndex++) {
            const currentPackageItems: typeof pkg.items = [];
            let currentCapacity = 0;
            
            for (const item of itemsWithFractions) {
              if (item.remainingQty <= 0) continue;
              
              // How many of this item can fit in remaining capacity?
              const remainingCapacity = 1.0 - currentCapacity;
              const maxItemsThatFit = Math.floor(remainingCapacity / item.fractionPerItem);
              const itemsToAdd = Math.min(maxItemsThatFit, item.remainingQty);
              
              if (itemsToAdd > 0) {
                currentPackageItems.push({
                  ...item,
                  quantity: itemsToAdd,
                });
                item.remainingQty -= itemsToAdd;
                currentCapacity += itemsToAdd * item.fractionPerItem;
              }
              
              // If package is full (or nearly full), stop adding
              if (currentCapacity >= 0.99) break;
            }
            
            // If package is empty but we still have items, add remaining (last package gets everything left)
            if (currentPackageItems.length === 0) {
              for (const item of itemsWithFractions) {
                if (item.remainingQty > 0) {
                  currentPackageItems.push({
                    ...item,
                    quantity: item.remainingQty,
                  });
                  item.remainingQty = 0;
                }
              }
            }
            
            distributedPackages.push(currentPackageItems);
          }
          
          // Create multiple shipments for paczkomat ONLY
          for (let i = 0; i < paczkomatPackages; i++) {
            const shipmentId = `${pkg.id}-paczkomat-${i + 1}`;
            const paczkomatPrice = isFree ? 0 : SHIPPING_PRICES.inpost_paczkomat;
            
            const methods: ShippingMethodForPackage[] = [
              {
                id: 'inpost_paczkomat',
                name: 'InPost Paczkomat',
                price: paczkomatPrice,
                available: true,
                message: freeMessage || `Paczka ${i + 1} z ${paczkomatPackages}`,
                estimatedDelivery: '1-2 dni',
              },
            ];
            
            // Create a virtual package for this shipment with distributed items
            const shipmentPackage = {
              ...pkg,
              id: shipmentId,
              paczkomatPackageCount: 1,
              shipmentIndex: i + 1,
              totalShipments: paczkomatPackages,
              isPaczkomatShipment: true, // Mark as paczkomat-only shipment
              items: distributedPackages[i] || [], // Each package gets its distributed items
            };
            
            packagesWithOptions.push({
              package: shipmentPackage as any,
              shippingMethods: methods,
              selectedMethod: 'inpost_paczkomat',
            });
          }
          
          // Add courier options as separate section (one courier takes all)
          const courierShipmentId = `${pkg.id}-courier`;
          const kurierInpostPrice = isFree ? 0 : SHIPPING_PRICES.inpost_kurier;
          
          const courierMethods: ShippingMethodForPackage[] = [
            {
              id: 'inpost_kurier',
              name: 'Kurier InPost',
              price: kurierInpostPrice,
              available: isInPostAvailable,
              message: freeMessage || 'Wszystkie produkty w jednej przesyłce',
              estimatedDelivery: '1-2 dni',
            },
          ];
          
          if (isDpdAvailable) {
            courierMethods.push({
              id: 'dpd_kurier',
              name: 'Kurier DPD',
              price: dpdPrice,
              available: true,
              message: freeMessage || 'Wszystkie produkty w jednej przesyłce',
              estimatedDelivery: '1-2 dni',
            });
          }
          
          const courierPackage = {
            ...pkg,
            id: courierShipmentId,
            paczkomatPackageCount: 1,
            isCourierAlternative: true, // Mark as courier alternative section
            items: pkg.items, // Show all items
          };
          
          packagesWithOptions.push({
            package: courierPackage as any,
            shippingMethods: courierMethods,
            selectedMethod: '', // No default - user must choose paczkomat or courier
          });
        } else {
          // Single package - standard flow
          const paczkomatPrice = isFree ? 0 : paczkomatPackages * SHIPPING_PRICES.inpost_paczkomat;
          const kurierPrice = isFree ? 0 : paczkomatPackages * SHIPPING_PRICES.inpost_kurier;
          
          const methods: ShippingMethodForPackage[] = [
            {
              id: 'inpost_paczkomat',
              name: 'InPost Paczkomat',
              price: paczkomatPrice,
              available: isInPostAvailable,
              message: !isInPostAvailable 
                ? 'Produkt dostępny tylko z DPD'
                : freeMessage,
              estimatedDelivery: '1-2 dni',
            },
            {
              id: 'inpost_kurier',
              name: 'Kurier InPost',
              price: kurierPrice,
              available: isInPostAvailable,
              message: !isInPostAvailable 
                ? 'Produkt dostępny tylko z DPD' 
                : freeMessage,
              estimatedDelivery: '1-2 dni',
            },
            {
              id: 'dpd_kurier',
              name: 'Kurier DPD',
              price: dpdPrice,
              available: isDpdAvailable,
              message: !isDpdAvailable 
                ? 'Produkt dostępny tylko z InPost' 
                : (freeMessage || (pkg.weightShippingPrice && !isFree ? `Cena wg wagi: ${dpdPrice.toFixed(2)} zł` : undefined)),
              estimatedDelivery: '1-2 dni',
            },
          ];
          
          const defaultMethod = pkg.isCourierOnly 
            ? 'dpd_kurier'
            : (pkg.isPaczkomatAvailable ? 'inpost_paczkomat' : 'inpost_kurier');
          
          packagesWithOptions.push({
            package: pkg,
            shippingMethods: methods,
            selectedMethod: defaultMethod,
          });
        }
      }
    }
    
    // Calculate initial total with default methods
    let totalShippingCost = 0;
    for (const pkgOpt of packagesWithOptions) {
      const selectedMethod = pkgOpt.shippingMethods.find(m => m.id === pkgOpt.selectedMethod && m.available);
      if (selectedMethod) {
        totalShippingCost += selectedMethod.price;
      }
    }
    
    // Calculate minimum possible shipping cost
    // For split shipments, we need to compare paczkomat total vs courier total
    let minShippingCost = totalShippingCost;
    
    // Separate paczkomat shipments and courier alternatives
    const paczkomatShipments = packagesWithOptions.filter(p => (p.package as any).isPaczkomatShipment);
    const courierAlternatives = packagesWithOptions.filter(p => (p.package as any).isCourierAlternative);
    const regularPackages = packagesWithOptions.filter(p => !(p.package as any).isPaczkomatShipment && !(p.package as any).isCourierAlternative);
    
    if (paczkomatShipments.length > 0 && courierAlternatives.length > 0) {
      // Calculate paczkomat option total
      const paczkomatTotal = paczkomatShipments.reduce((sum, p) => {
        const method = p.shippingMethods.find(m => m.id === 'inpost_paczkomat' && m.available);
        return sum + (method?.price || 0);
      }, 0);
      
      // Calculate courier option total (cheapest courier for each alternative)
      const courierTotal = courierAlternatives.reduce((sum, p) => {
        const availableMethods = p.shippingMethods.filter(m => m.available);
        const cheapest = availableMethods.reduce((min, m) => m.price < min ? m.price : min, Infinity);
        return sum + (cheapest === Infinity ? 0 : cheapest);
      }, 0);
      
      // Regular packages (non-split) - use cheapest available method
      const regularTotal = regularPackages.reduce((sum, p) => {
        const availableMethods = p.shippingMethods.filter(m => m.available);
        const cheapest = availableMethods.reduce((min, m) => m.price < min ? m.price : min, Infinity);
        return sum + (cheapest === Infinity ? 0 : cheapest);
      }, 0);
      
      // Minimum is the lower of paczkomat or courier option, plus regular packages
      minShippingCost = Math.min(paczkomatTotal, courierTotal) + regularTotal;
    } else {
      // No split shipments - minimum is cheapest method for each package
      minShippingCost = packagesWithOptions.reduce((sum, p) => {
        const availableMethods = p.shippingMethods.filter(m => m.available);
        const cheapest = availableMethods.reduce((min, m) => m.price < min ? m.price : min, Infinity);
        return sum + (cheapest === Infinity ? 0 : cheapest);
      }, 0);
    }
    
    return {
      packagesWithOptions,
      totalShippingCost,
      minShippingCost,
      warnings: calculation.warnings,
    };
  }
}

export const shippingCalculatorService = new ShippingCalculatorService();
