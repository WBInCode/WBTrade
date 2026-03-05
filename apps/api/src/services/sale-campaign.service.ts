/**
 * ============================================
 * Sale Campaign Service (System Przecen)
 * ============================================
 * 
 * Zarządzanie kampaniami przecenowymi. Pozwala na masowe ustawianie
 * cen promocyjnych za pomocą mnożników, procentów lub kwot stałych.
 * 
 * Mechanizm: compareAtPrice = oryginalna cena (przekreślona), price = nowa cena po rabacie
 * Przechowywane oryginalne ceny w SaleCampaignProduct dla bezpiecznego przywrócenia.
 */

import { PriceChangeSource, SaleCampaignStatus, DiscountType, CampaignScope } from '@prisma/client';
import { prisma } from '../db';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// TYPY
// ============================================

interface CreateCampaignData {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  roundTo99?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  scope: CampaignScope;
  scopeValue?: string[];
  stackableWithCoupons?: boolean;
  createdBy?: string;
}

interface UpdateCampaignData {
  name?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  roundTo99?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  scope?: CampaignScope;
  scopeValue?: string[];
  stackableWithCoupons?: boolean;
}

interface PreviewItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  currentPrice: number;
  newPrice: number;
  discountPercent: number;
}

interface CampaignFilters {
  page?: number;
  limit?: number;
  status?: SaleCampaignStatus;
  search?: string;
}

// ============================================
// HELPERS
// ============================================

function roundTo99(price: number): number {
  return Math.floor(price) + 0.99;
}

function calculateSalePrice(
  currentPrice: number,
  discountType: DiscountType,
  discountValue: number,
  shouldRoundTo99: boolean
): number {
  let newPrice: number;

  switch (discountType) {
    case 'PERCENTAGE':
      // discountValue = 20 → 20% off → price * 0.80
      newPrice = currentPrice * (1 - discountValue / 100);
      break;
    case 'FIXED_AMOUNT':
      // discountValue = 50 → subtract 50 zł
      newPrice = currentPrice - discountValue;
      break;
    case 'MULTIPLIER':
      // discountValue = 0.8 → price * 0.8
      newPrice = currentPrice * discountValue;
      break;
    default:
      newPrice = currentPrice;
  }

  // Ensure price doesn't go below 0.01
  newPrice = Math.max(0.01, newPrice);

  if (shouldRoundTo99) {
    newPrice = roundTo99(newPrice);
  } else {
    // Round to 2 decimal places
    newPrice = Math.round(newPrice * 100) / 100;
  }

  return newPrice;
}

// ============================================
// SERVICE
// ============================================

export class SaleCampaignService {

  /**
   * Get campaigns with pagination and filters
   */
  async getCampaigns(filters: CampaignFilters) {
    const { page = 1, limit = 20, status, search } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.saleCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.saleCampaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get single campaign by ID with product details
   */
  async getCampaignById(id: string) {
    const campaign = await prisma.saleCampaign.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: { select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, images: { take: 1, select: { url: true } } } },
            variant: { select: { id: true, name: true, sku: true, price: true, compareAtPrice: true } },
          },
          take: 100,
        },
        _count: { select: { products: true } },
      },
    });

    return campaign;
  }

  /**
   * Create a new campaign (DRAFT status)
   */
  async createCampaign(data: CreateCampaignData) {
    const status: SaleCampaignStatus = 'DRAFT';

    const campaign = await prisma.saleCampaign.create({
      data: {
        name: data.name,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: new Decimal(data.discountValue.toString()),
        roundTo99: data.roundTo99 ?? false,
        startsAt: data.startsAt || null,
        endsAt: data.endsAt || null,
        status,
        scope: data.scope,
        scopeValue: data.scopeValue || [],
        stackableWithCoupons: data.stackableWithCoupons ?? true,
        createdBy: data.createdBy || null,
      },
    });

    return campaign;
  }

  /**
   * Update a campaign (only DRAFT or SCHEDULED)
   */
  async updateCampaign(id: string, data: UpdateCampaignData) {
    const campaign = await prisma.saleCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('Kampania nie znaleziona');
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error('Można edytować tylko kampanie w statusie Szkic lub Zaplanowana');
    }

    const updated = await prisma.saleCampaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: new Decimal(data.discountValue.toString()) }),
        ...(data.roundTo99 !== undefined && { roundTo99: data.roundTo99 }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
        ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
        ...(data.scope !== undefined && { scope: data.scope }),
        ...(data.scopeValue !== undefined && { scopeValue: data.scopeValue }),
        ...(data.stackableWithCoupons !== undefined && { stackableWithCoupons: data.stackableWithCoupons }),
      },
    });

    return updated;
  }

  /**
   * Delete a campaign (only DRAFT)
   */
  async deleteCampaign(id: string) {
    const campaign = await prisma.saleCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('Kampania nie znaleziona');
    if (campaign.status !== 'DRAFT') {
      throw new Error('Można usunąć tylko kampanie w statusie Szkic');
    }

    await prisma.saleCampaign.delete({ where: { id } });
    return { message: 'Kampania usunięta' };
  }

  /**
   * Get products matching campaign scope (for preview)
   */
  async getAffectedProducts(scope: CampaignScope, scopeValue: string[], limit = 50) {
    const where: Record<string, unknown> = { status: 'ACTIVE' };

    switch (scope) {
      case 'CATEGORY':
        if (scopeValue.length > 0) {
          where.categoryId = { in: scopeValue };
        }
        break;
      case 'WAREHOUSE':
        if (scopeValue.length > 0) {
          where.OR = scopeValue.map(wh => ({
            sku: { startsWith: wh, mode: 'insensitive' },
          }));
        }
        break;
      case 'SELECTED':
        if (scopeValue.length > 0) {
          where.id = { in: scopeValue };
        }
        break;
      case 'TAG':
        if (scopeValue.length > 0) {
          where.tags = { hasSome: scopeValue };
        }
        break;
      case 'ALL':
      default:
        break;
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        compareAtPrice: true,
        images: { take: 1, select: { url: true } },
        variants: {
          select: { id: true, name: true, sku: true, price: true, compareAtPrice: true },
        },
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    const total = await prisma.product.count({ where });

    return { products, total };
  }

  /**
   * Preview calculated prices for a campaign (without applying)
   */
  async previewCampaign(id: string): Promise<{ items: PreviewItem[]; totalProducts: number }> {
    const campaign = await prisma.saleCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('Kampania nie znaleziona');

    const { products, total } = await this.getAffectedProducts(
      campaign.scope,
      campaign.scopeValue,
      100
    );

    const items: PreviewItem[] = [];

    for (const product of products) {
      const currentPrice = Number(product.price);
      const newPrice = calculateSalePrice(
        currentPrice,
        campaign.discountType,
        Number(campaign.discountValue),
        campaign.roundTo99
      );
      const discountPercent = Math.round((1 - newPrice / currentPrice) * 100);

      items.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        currentPrice,
        newPrice,
        discountPercent,
      });

      // Also preview variants
      for (const variant of product.variants) {
        const variantPrice = Number(variant.price);
        const variantNewPrice = calculateSalePrice(
          variantPrice,
          campaign.discountType,
          Number(campaign.discountValue),
          campaign.roundTo99
        );
        const variantDiscount = Math.round((1 - variantNewPrice / variantPrice) * 100);

        items.push({
          productId: product.id,
          variantId: variant.id,
          name: `${product.name} — ${variant.name}`,
          sku: variant.sku,
          currentPrice: variantPrice,
          newPrice: variantNewPrice,
          discountPercent: variantDiscount,
        });
      }
    }

    return { items, totalProducts: total };
  }

  /**
   * ACTIVATE a campaign — the core operation.
   * In a transaction:
   * 1. Fetch products matching scope
   * 2. Check for conflicts (product already in another active campaign)
   * 3. Calculate new prices
   * 4. Store originals in SaleCampaignProduct
   * 5. Set compareAtPrice = old price, price = new sale price
   * 6. Record PriceHistory
   * 7. Set campaign status to ACTIVE
   */
  async activateCampaign(id: string, userId?: string) {
    const campaign = await prisma.saleCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('Kampania nie znaleziona');
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error('Można aktywować tylko kampanie w statusie Szkic lub Zaplanowana');
    }

    // Get ALL affected products (no limit)
    const where: Record<string, unknown> = { status: 'ACTIVE' };
    switch (campaign.scope) {
      case 'CATEGORY':
        if (campaign.scopeValue.length > 0) where.categoryId = { in: campaign.scopeValue };
        break;
      case 'WAREHOUSE':
        if (campaign.scopeValue.length > 0) {
          where.OR = campaign.scopeValue.map(wh => ({
            sku: { startsWith: wh, mode: 'insensitive' },
          }));
        }
        break;
      case 'SELECTED':
        if (campaign.scopeValue.length > 0) where.id = { in: campaign.scopeValue };
        break;
      case 'TAG':
        if (campaign.scopeValue.length > 0) where.tags = { hasSome: campaign.scopeValue };
        break;
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true, name: true, sku: true, price: true, compareAtPrice: true,
        variants: {
          select: { id: true, name: true, sku: true, price: true, compareAtPrice: true },
        },
      },
    });

    if (products.length === 0) {
      throw new Error('Kampania nie obejmuje żadnych produktów');
    }

    // Check for conflicts — products already in another active campaign
    const productIds = products.map(p => p.id);

    const conflicts = await prisma.saleCampaignProduct.findMany({
      where: {
        productId: { in: productIds },
        campaign: { status: 'ACTIVE', id: { not: id } },
      },
      include: { campaign: { select: { name: true } } },
      take: 5,
    });

    if (conflicts.length > 0) {
      const campaignNames = [...new Set(conflicts.map(c => c.campaign.name))];
      throw new Error(
        `${conflicts.length} produktów jest już w aktywnych kampaniach: ${campaignNames.join(', ')}. Najpierw dezaktywuj tamte kampanie.`
      );
    }

    // Apply prices in transaction (batched for performance)
    const BATCH_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const product of batch) {
          const currentPrice = Number(product.price);
          const newPrice = calculateSalePrice(
            currentPrice,
            campaign.discountType,
            Number(campaign.discountValue),
            campaign.roundTo99
          );

          // Skip if new price >= current price (no discount)
          if (newPrice >= currentPrice) continue;

          // Save original prices in junction table
          await tx.saleCampaignProduct.create({
            data: {
              campaignId: id,
              productId: product.id,
              variantId: null,
              originalPrice: product.price,
              originalCompareAtPrice: product.compareAtPrice,
              salePrice: new Decimal(newPrice.toString()),
            },
          });

          // OMNIBUS: Calculate lowest price from last 30 days BEFORE this promotion
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const priceHistoryResult = await tx.priceHistory.aggregate({
            where: {
              productId: product.id,
              variantId: null,
              changedAt: { gte: thirtyDaysAgo }
            },
            _min: { newPrice: true, oldPrice: true }
          });
          
          // Get lowest from history or use current price
          let lowestFromHistory = priceHistoryResult._min.newPrice || priceHistoryResult._min.oldPrice;
          if (priceHistoryResult._min.oldPrice && lowestFromHistory) {
            if (priceHistoryResult._min.oldPrice.lessThan(lowestFromHistory)) {
              lowestFromHistory = priceHistoryResult._min.oldPrice;
            }
          }
          
          // Lowest is minimum of: historical lowest OR current price (before discount)
          const lowestPrice30Days = lowestFromHistory && lowestFromHistory.lessThan(product.price)
            ? lowestFromHistory
            : product.price;

          // Update product: compareAtPrice = old price, price = new sale price, lowestPrice30Days = Omnibus price
          await tx.product.update({
            where: { id: product.id },
            data: {
              compareAtPrice: product.price,
              price: new Decimal(newPrice.toString()),
              lowestPrice30Days: lowestPrice30Days,
              lowestPrice30DaysAt: new Date(),
            },
          });

          // Record price history
          await tx.priceHistory.create({
            data: {
              productId: product.id,
              variantId: null,
              oldPrice: product.price,
              newPrice: new Decimal(newPrice.toString()),
              source: 'SYSTEM' as PriceChangeSource,
              changedBy: userId || null,
              reason: `Kampania przecenowa: ${campaign.name}`,
            },
          });

          // Handle variants
          for (const variant of product.variants) {
            const variantPrice = Number(variant.price);
            const variantNewPrice = calculateSalePrice(
              variantPrice,
              campaign.discountType,
              Number(campaign.discountValue),
              campaign.roundTo99
            );

            if (variantNewPrice >= variantPrice) continue;

            await tx.saleCampaignProduct.create({
              data: {
                campaignId: id,
                productId: product.id,
                variantId: variant.id,
                originalPrice: variant.price,
                originalCompareAtPrice: variant.compareAtPrice,
                salePrice: new Decimal(variantNewPrice.toString()),
              },
            });

            // OMNIBUS: Calculate lowest price from last 30 days for variant
            const variantHistoryResult = await tx.priceHistory.aggregate({
              where: {
                variantId: variant.id,
                changedAt: { gte: thirtyDaysAgo }
              },
              _min: { newPrice: true, oldPrice: true }
            });
            
            let variantLowestFromHistory = variantHistoryResult._min.newPrice || variantHistoryResult._min.oldPrice;
            if (variantHistoryResult._min.oldPrice && variantLowestFromHistory) {
              if (variantHistoryResult._min.oldPrice.lessThan(variantLowestFromHistory)) {
                variantLowestFromHistory = variantHistoryResult._min.oldPrice;
              }
            }
            
            const variantLowestPrice30Days = variantLowestFromHistory && variantLowestFromHistory.lessThan(variant.price)
              ? variantLowestFromHistory
              : variant.price;

            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                compareAtPrice: variant.price,
                price: new Decimal(variantNewPrice.toString()),
                lowestPrice30Days: variantLowestPrice30Days,
                lowestPrice30DaysAt: new Date(),
              },
            });

            await tx.priceHistory.create({
              data: {
                productId: product.id,
                variantId: variant.id,
                oldPrice: variant.price,
                newPrice: new Decimal(variantNewPrice.toString()),
                source: 'SYSTEM' as PriceChangeSource,
                changedBy: userId || null,
                reason: `Kampania przecenowa: ${campaign.name}`,
              },
            });
          }

          processedCount++;
        }
      }, {
        maxWait: 30000,
        timeout: 60000,
      });
    }

    // Update campaign status
    await prisma.saleCampaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    console.log(`✅ [SaleCampaign] Activated "${campaign.name}" — ${processedCount} products discounted`);
    return { processedCount };
  }

  /**
   * DEACTIVATE a campaign — restore original prices
   */
  async deactivateCampaign(id: string, userId?: string, newStatus: 'ENDED' | 'CANCELLED' = 'ENDED') {
    const campaign = await prisma.saleCampaign.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!campaign) throw new Error('Kampania nie znaleziona');
    if (campaign.status !== 'ACTIVE') {
      throw new Error('Można dezaktywować tylko aktywne kampanie');
    }

    const BATCH_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < campaign.products.length; i += BATCH_SIZE) {
      const batch = campaign.products.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const cp of batch) {
          if (cp.variantId) {
            // Restore variant price
            await tx.productVariant.update({
              where: { id: cp.variantId },
              data: {
                price: cp.originalPrice,
                compareAtPrice: cp.originalCompareAtPrice,
              },
            });

            await tx.priceHistory.create({
              data: {
                productId: cp.productId,
                variantId: cp.variantId,
                oldPrice: cp.salePrice,
                newPrice: cp.originalPrice,
                source: 'SYSTEM' as PriceChangeSource,
                changedBy: userId || null,
                reason: `Koniec kampanii: ${campaign.name}`,
              },
            });
          } else {
            // Restore product price
            await tx.product.update({
              where: { id: cp.productId },
              data: {
                price: cp.originalPrice,
                compareAtPrice: cp.originalCompareAtPrice,
              },
            });

            await tx.priceHistory.create({
              data: {
                productId: cp.productId,
                variantId: null,
                oldPrice: cp.salePrice,
                newPrice: cp.originalPrice,
                source: 'SYSTEM' as PriceChangeSource,
                changedBy: userId || null,
                reason: `Koniec kampanii: ${campaign.name}`,
              },
            });
          }

          processedCount++;
        }
      }, {
        maxWait: 30000,
        timeout: 60000,
      });
    }

    // Delete junction records and update status
    await prisma.saleCampaignProduct.deleteMany({ where: { campaignId: id } });
    await prisma.saleCampaign.update({
      where: { id },
      data: { status: newStatus },
    });

    console.log(`✅ [SaleCampaign] Deactivated "${campaign.name}" — ${processedCount} products restored`);
    return { processedCount };
  }

  /**
   * Check if a product is in an active non-stackable campaign.
   * Used by cart service to block coupon application.
   */
  async isProductInNonStackableCampaign(productId: string): Promise<boolean> {
    const record = await prisma.saleCampaignProduct.findFirst({
      where: {
        productId,
        campaign: {
          status: 'ACTIVE',
          stackableWithCoupons: false,
        },
      },
    });
    return !!record;
  }

  /**
   * Check if any products in a list are in non-stackable campaigns.
   * Returns product IDs that block coupon usage.
   */
  async getProductsInNonStackableCampaigns(productIds: string[]): Promise<string[]> {
    const records = await prisma.saleCampaignProduct.findMany({
      where: {
        productId: { in: productIds },
        campaign: {
          status: 'ACTIVE',
          stackableWithCoupons: false,
        },
      },
      select: { productId: true },
      distinct: ['productId'],
    });
    return records.map(r => r.productId);
  }

  /**
   * Get campaign stats
   */
  async getStats() {
    const [total, active, draft, scheduled, ended] = await Promise.all([
      prisma.saleCampaign.count(),
      prisma.saleCampaign.count({ where: { status: 'ACTIVE' } }),
      prisma.saleCampaign.count({ where: { status: 'DRAFT' } }),
      prisma.saleCampaign.count({ where: { status: 'SCHEDULED' } }),
      prisma.saleCampaign.count({ where: { status: { in: ['ENDED', 'CANCELLED'] } } }),
    ]);

    // Count total discounted products
    const discountedProducts = await prisma.saleCampaignProduct.count({
      where: { campaign: { status: 'ACTIVE' } },
    });

    return { total, active, draft, scheduled, ended, discountedProducts };
  }
}

export const saleCampaignService = new SaleCampaignService();
