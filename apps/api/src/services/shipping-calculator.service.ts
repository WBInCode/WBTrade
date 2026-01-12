/**
 * Shipping Calculator Service
 * 
 * Calculates shipping costs based on product tags.
 * 
 * Rules:
 * 1. GABARYT (oversized) - Each oversized product requires individual shipping, costs are summed
 * 2. HURTOWNIA (wholesaler) - Products from different wholesalers are shipped separately
 * 3. Non-oversized from same wholesaler - Packed together as one shipment
 * 4. Paczkomat limits - Tags like "X produktów w paczce" define package limits
 * 5. Gabaryt + non-gabaryt - Two separate shipments (costs sum up)
 */

import { prisma } from '../db';

// Tag patterns for matching
const TAG_PATTERNS = {
  // Matches "gabaryt" or "tylko kurier" tags (case insensitive)
  GABARYT: /^(gabaryt|tylko\s*kurier)$/i,
  // Matches wholesaler tags like "hurtownia:nazwa" or "hurtownia-nazwa" or just the wholesaler name
  // Common wholesalers: Ikonka, BTP, etc.
  WHOLESALER: /^(hurtownia[:\-_](.+)|Ikonka|BTP|Gastro|Horeca)$/i,
  // Matches paczkomat limit tags like "1 produkt w paczce", "3 produkty w paczce", "5 produktów w paczce"
  PACZKOMAT_LIMIT: /^(\d+)\s*produkt(?:y|ów)?\s*w\s*paczce$/i,
  // Matches tags that indicate courier-only delivery
  COURIER_ONLY: /^(tylko\s*kurier)$/i,
  // Matches tags that indicate paczkomat is available
  PACZKOMAT_AVAILABLE: /^(paczkomaty?\s*(i\s*kurier)?|paczkomat)$/i,
} as const;

// Shipping method prices (in PLN)
export const SHIPPING_PRICES = {
  // Standard shipping prices
  inpost_paczkomat: 14.99,
  inpost_kurier: 19.99,
  dpd: 19.99,
  dhl: 24.99,
  gls: 22.99,
  pocztex: 17.99,
  fedex: 29.99,
  ups: 29.99,
  // Oversized (gabaryt) shipping prices - typically higher
  gabaryt_kurier: 49.99,
  gabaryt_base: 49.99, // Base price for oversized items
} as const;

export interface CartItemForShipping {
  variantId: string;
  quantity: number;
  productId?: string;
  productName?: string;
  tags?: string[];
}

export interface ProductWithTags {
  id: string;
  name: string;
  tags: string[];
}

export interface ShippingPackage {
  id: string;
  type: 'standard' | 'gabaryt';
  wholesaler: string | null;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string;
    quantity: number;
    isGabaryt: boolean;
  }>;
  paczkomatPackageCount: number; // Number of paczkomat packages needed (based on limits)
}

export interface ShippingCalculationResult {
  packages: ShippingPackage[];
  totalPackages: number;
  totalPaczkomatPackages: number; // For paczkomat delivery
  shippingCost: number;
  paczkomatCost: number; // Cost if using paczkomat
  breakdown: Array<{
    description: string;
    cost: number;
    packageCount: number;
  }>;
  warnings: string[];
  isPaczkomatAvailable: boolean;
}

/**
 * Extract tag value from product tags
 */
function extractTagValue(tags: string[], pattern: RegExp): string | null {
  for (const tag of tags) {
    const match = tag.match(pattern);
    if (match) {
      return match[2] || match[1] || tag;
    }
  }
  return null;
}

/**
 * Check if product has gabaryt tag (oversized or courier-only)
 */
function isGabaryt(tags: string[]): boolean {
  return tags.some(tag => TAG_PATTERNS.GABARYT.test(tag));
}

/**
 * Check if product explicitly allows paczkomat
 */
function allowsPaczkomat(tags: string[]): boolean {
  // If no delivery-related tags, default to allowing paczkomat
  const hasCourierOnly = tags.some(tag => TAG_PATTERNS.COURIER_ONLY.test(tag));
  const hasPaczkomatTag = tags.some(tag => TAG_PATTERNS.PACZKOMAT_AVAILABLE.test(tag));
  
  if (hasCourierOnly) return false;
  if (hasPaczkomatTag) return true;
  
  // Default: allow paczkomat unless marked as gabaryt/courier-only
  return !isGabaryt(tags);
}

/**
 * Get wholesaler from product tags
 */
function getWholesaler(tags: string[]): string | null {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.WHOLESALER);
    if (match) {
      // Return the extracted wholesaler name or the matched tag
      return match[2] || match[1] || tag;
    }
  }
  return null;
}

/**
 * Get paczkomat limit from product tags (how many fit in one paczkomat package)
 */
function getPaczkomatLimit(tags: string[]): number {
  const match = extractTagValue(tags, TAG_PATTERNS.PACZKOMAT_LIMIT);
  if (match) {
    const limit = parseInt(match, 10);
    if (!isNaN(limit) && limit > 0) {
      return limit;
    }
  }
  // Default: no limit specified means unlimited (or very high number)
  return 10;
}

export class ShippingCalculatorService {
  /**
   * Calculate shipping for cart items
   */
  async calculateShipping(
    items: CartItemForShipping[],
    shippingMethod: string = 'inpost_paczkomat'
  ): Promise<ShippingCalculationResult> {
    const warnings: string[] = [];
    const packages: ShippingPackage[] = [];
    
    // Fetch products with tags if not provided
    const productIds = new Set<string>();
    const variantToProduct = new Map<string, ProductWithTags>();
    
    // Get variant to product mapping
    const variantIds = items.map(item => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            tags: true,
          },
        },
      },
    });
    
    for (const variant of variants) {
      variantToProduct.set(variant.id, {
        id: variant.product.id,
        name: variant.product.name,
        tags: variant.product.tags,
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
        // Each gabaryt item is its own package
        gabarytItems.push({ product, variantId: item.variantId, quantity: item.quantity });
      } else {
        // Group standard items by wholesaler
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
      // Each unit of gabaryt is a separate package
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
          }],
          paczkomatPackageCount: 0, // Gabaryt cannot go to paczkomat
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
      }));
      
      // Calculate paczkomat packages needed for this wholesaler's items
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
      });
    }
    
    // Calculate costs
    const gabarytPackageCount = packages.filter(p => p.type === 'gabaryt').length;
    const standardPackageCount = packages.filter(p => p.type === 'standard').length;
    const totalPackages = gabarytPackageCount + standardPackageCount;
    
    // Calculate paczkomat package count (sum of all paczkomat packages from standard items)
    const totalPaczkomatPackages = packages.reduce((sum, p) => sum + p.paczkomatPackageCount, 0);
    
    // Determine if paczkomat is available (no gabaryt items)
    const isPaczkomatAvailable = gabarytPackageCount === 0;
    
    // Calculate costs
    const breakdown: Array<{ description: string; cost: number; packageCount: number }> = [];
    
    // Gabaryt costs (each gabaryt item shipped separately at gabaryt rate)
    if (gabarytPackageCount > 0) {
      const gabarytCost = gabarytPackageCount * SHIPPING_PRICES.gabaryt_base;
      breakdown.push({
        description: `Produkty gabarytowe (${gabarytPackageCount} szt.)`,
        cost: gabarytCost,
        packageCount: gabarytPackageCount,
      });
    }
    
    // Standard package costs (one per wholesaler)
    if (standardPackageCount > 0) {
      const basePrice = this.getBaseShippingPrice(shippingMethod);
      const standardCost = standardPackageCount * basePrice;
      breakdown.push({
        description: `Standardowe paczki (${standardPackageCount} hurtowni)`,
        cost: standardCost,
        packageCount: standardPackageCount,
      });
    }
    
    // Total shipping cost for courier
    const shippingCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
    
    // Paczkomat cost (based on package limits)
    const paczkomatCost = isPaczkomatAvailable
      ? totalPaczkomatPackages * SHIPPING_PRICES.inpost_paczkomat
      : 0;
    
    // Add warnings
    if (!isPaczkomatAvailable) {
      warnings.push('Produkty gabarytowe nie mogą być wysłane do paczkomatu. Dostępna tylko dostawa kurierem.');
    }
    
    if (standardPackageCount > 1) {
      warnings.push(`Produkty pochodzą z ${standardPackageCount} różnych hurtowni, dlatego będą wysłane jako ${standardPackageCount} osobne paczki.`);
    }
    
    if (totalPaczkomatPackages > 1 && isPaczkomatAvailable) {
      warnings.push(`Ze względu na limity pakowania, produkty zostaną wysłane w ${totalPaczkomatPackages} paczkach do paczkomatu.`);
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
      case 'inpost_paczkomat':
        return SHIPPING_PRICES.inpost_paczkomat;
      case 'inpost_kurier':
        return SHIPPING_PRICES.inpost_kurier;
      case 'dpd':
        return SHIPPING_PRICES.dpd;
      case 'dhl':
        return SHIPPING_PRICES.dhl;
      case 'gls':
        return SHIPPING_PRICES.gls;
      case 'pocztex':
        return SHIPPING_PRICES.pocztex;
      case 'fedex':
        return SHIPPING_PRICES.fedex;
      case 'ups':
        return SHIPPING_PRICES.ups;
      default:
        return SHIPPING_PRICES.inpost_kurier;
    }
  }
  
  /**
   * Calculate shipping cost for specific method
   */
  async calculateShippingCost(
    items: CartItemForShipping[],
    shippingMethod: string
  ): Promise<{ cost: number; paczkomatCost: number; warnings: string[] }> {
    const result = await this.calculateShipping(items, shippingMethod);
    
    // For paczkomat, return paczkomat cost
    if (shippingMethod === 'inpost_paczkomat') {
      if (!result.isPaczkomatAvailable) {
        throw new Error('Produkty gabarytowe nie mogą być wysłane do paczkomatu.');
      }
      return {
        cost: result.paczkomatCost,
        paczkomatCost: result.paczkomatCost,
        warnings: result.warnings,
      };
    }
    
    return {
      cost: result.shippingCost,
      paczkomatCost: result.paczkomatCost,
      warnings: result.warnings,
    };
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
    const calculation = await this.calculateShipping(items, 'inpost_kurier');
    
    const methods = [
      {
        id: 'inpost_paczkomat',
        name: 'InPost Paczkomat',
        price: calculation.paczkomatCost,
        available: calculation.isPaczkomatAvailable,
        message: calculation.isPaczkomatAvailable 
          ? (calculation.totalPaczkomatPackages > 1 
              ? `${calculation.totalPaczkomatPackages} paczki` 
              : undefined)
          : 'Produkty gabarytowe wykluczają dostawę do paczkomatu',
      },
      {
        id: 'inpost_kurier',
        name: 'InPost Kurier',
        price: calculation.shippingCost,
        available: true,
      },
      {
        id: 'dpd',
        name: 'DPD',
        price: this.recalculateCourierPrice(calculation, 'dpd'),
        available: true,
      },
      {
        id: 'dhl',
        name: 'DHL',
        price: this.recalculateCourierPrice(calculation, 'dhl'),
        available: true,
      },
    ];
    
    return methods;
  }
  
  /**
   * Recalculate price for different courier
   */
  private recalculateCourierPrice(calculation: ShippingCalculationResult, method: string): number {
    const gabarytCount = calculation.packages.filter(p => p.type === 'gabaryt').length;
    const standardCount = calculation.packages.filter(p => p.type === 'standard').length;
    
    const gabarytCost = gabarytCount * SHIPPING_PRICES.gabaryt_base;
    const standardCost = standardCount * this.getBaseShippingPrice(method);
    
    return gabarytCost + standardCost;
  }
}

export const shippingCalculatorService = new ShippingCalculatorService();
