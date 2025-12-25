/**
 * Baselinker Service
 * 
 * Handles all Baselinker integration logic:
 * - Configuration management with encryption
 * - Product, category, stock synchronization
 * - Image sync
 * - Meilisearch reindexing after sync
 */

import { prisma } from '../db';
import { encryptToken, decryptToken, maskToken } from '../lib/encryption';
import { createBaselinkerProvider, BaselinkerProvider, BaselinkerInventory } from '../providers/baselinker';
import { meiliClient, PRODUCTS_INDEX } from '../lib/meilisearch';
import { BaselinkerSyncType, BaselinkerSyncStatus } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface SaveConfigInput {
  apiToken?: string;  // Optional for updates (keep existing token)
  inventoryId: string;
}

export interface ConfigOutput {
  inventoryId: string;
  tokenMasked: string;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestConnectionResult {
  success: boolean;
  inventories?: BaselinkerInventory[];
  error?: string;
}

export interface SyncTriggerResult {
  syncLogId: string;
}

export interface SyncStatus {
  configured: boolean;
  lastSyncAt: Date | null;
  currentSync: {
    id: string;
    type: BaselinkerSyncType;
    status: BaselinkerSyncStatus;
    startedAt: Date;
  } | null;
  recentLogs: Array<{
    id: string;
    type: BaselinkerSyncType;
    status: BaselinkerSyncStatus;
    itemsProcessed: number;
    errors: any;
    startedAt: Date;
    completedAt: Date | null;
  }>;
}

// ============================================
// Helper Functions
// ============================================

// Polish character transliteration map
const polishCharsMap: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

function slugify(text: string): string {
  // First transliterate Polish characters
  let result = text.toString();
  for (const [polish, ascii] of Object.entries(polishCharsMap)) {
    result = result.replace(new RegExp(polish, 'g'), ascii);
  }
  
  return result
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateSku(productId: number, existingSku?: string): string {
  if (existingSku && existingSku.trim()) {
    return existingSku.trim();
  }
  return `BL-${productId}`;
}

// ============================================
// Service Class
// ============================================

export class BaselinkerService {
  /**
   * Save or update Baselinker configuration
   */
  async saveConfig(input: SaveConfigInput): Promise<ConfigOutput> {
    const { apiToken, inventoryId } = input;

    // Check if config already exists
    const existingConfig = await prisma.baselinkerConfig.findFirst({
      where: { inventoryId },
    });

    let config;

    if (apiToken) {
      // New token provided - encrypt and save
      const encrypted = encryptToken(apiToken);

      config = await prisma.baselinkerConfig.upsert({
        where: { inventoryId },
        update: {
          apiTokenEncrypted: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          authTag: encrypted.authTag,
        },
        create: {
          inventoryId,
          apiTokenEncrypted: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          authTag: encrypted.authTag,
        },
      });

      return {
        inventoryId: config.inventoryId,
        tokenMasked: maskToken(apiToken),
        lastSyncAt: config.lastSyncAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } else if (existingConfig) {
      // No token update needed, just return existing config
      const decryptedToken = decryptToken(
        existingConfig.apiTokenEncrypted,
        existingConfig.encryptionIv,
        existingConfig.authTag
      );

      return {
        inventoryId: existingConfig.inventoryId,
        tokenMasked: maskToken(decryptedToken),
        lastSyncAt: existingConfig.lastSyncAt,
        createdAt: existingConfig.createdAt,
        updatedAt: existingConfig.updatedAt,
      };
    } else {
      throw new Error('API token is required for initial configuration');
    }
  }

  /**
   * Get current configuration (with masked token)
   */
  async getConfig(): Promise<ConfigOutput | null> {
    const config = await prisma.baselinkerConfig.findFirst();

    if (!config) {
      return null;
    }

    try {
      // Decrypt token just to mask it
      const decryptedToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      return {
        inventoryId: config.inventoryId,
        tokenMasked: maskToken(decryptedToken),
        lastSyncAt: config.lastSyncAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } catch (error) {
      // Token encryption key changed - config is invalid, delete it
      console.warn('Invalid encryption key for stored config, removing corrupt config');
      await prisma.baselinkerConfig.deleteMany();
      await prisma.baselinkerSyncLog.deleteMany();
      return null;
    }
  }

  /**
   * Delete Baselinker configuration
   */
  async deleteConfig(): Promise<void> {
    await prisma.baselinkerConfig.deleteMany();
    await prisma.baselinkerSyncLog.deleteMany();
  }

  /**
   * Get decrypted API token from stored config
   */
  async getDecryptedToken(): Promise<{ token: string; inventoryId: string } | null> {
    const config = await prisma.baselinkerConfig.findFirst();

    if (!config) {
      return null;
    }

    try {
      const token = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      return { token, inventoryId: config.inventoryId };
    } catch (error) {
      // Token encryption key changed - config is invalid
      console.warn('Invalid encryption key for stored config, removing corrupt config');
      await prisma.baselinkerConfig.deleteMany();
      await prisma.baselinkerSyncLog.deleteMany();
      return null;
    }
  }

  /**
   * Create Baselinker provider instance
   */
  private async createProvider(apiToken?: string): Promise<BaselinkerProvider> {
    if (apiToken) {
      return createBaselinkerProvider({
        apiToken,
        inventoryId: process.env.BASELINKER_DEFAULT_INVENTORY_ID || '',
      });
    }

    const stored = await this.getDecryptedToken();
    if (!stored) {
      throw new Error('No Baselinker configuration found');
    }

    return createBaselinkerProvider({
      apiToken: stored.token,
      inventoryId: stored.inventoryId,
    });
  }

  /**
   * Test connection to Baselinker API
   */
  async testConnection(apiToken?: string): Promise<TestConnectionResult> {
    try {
      const provider = await this.createProvider(apiToken);
      const inventories = await provider.getInventories();

      return {
        success: true,
        inventories,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get inventories from Baselinker
   */
  async getInventories(): Promise<BaselinkerInventory[]> {
    const provider = await this.createProvider();
    return provider.getInventories();
  }

  /**
   * Trigger sync (creates sync log and starts sync)
   */
  async triggerSync(type: string): Promise<SyncTriggerResult> {
    // Map string type to enum
    const typeMap: Record<string, BaselinkerSyncType> = {
      full: BaselinkerSyncType.PRODUCTS,
      products: BaselinkerSyncType.PRODUCTS,
      categories: BaselinkerSyncType.CATEGORIES,
      stock: BaselinkerSyncType.STOCK,
      images: BaselinkerSyncType.IMAGES,
    };

    const syncType = typeMap[type] || BaselinkerSyncType.PRODUCTS;

    // Clean up any stuck RUNNING syncs (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.baselinkerSyncLog.updateMany({
      where: {
        status: BaselinkerSyncStatus.RUNNING,
        startedAt: { lt: thirtyMinutesAgo },
      },
      data: {
        status: BaselinkerSyncStatus.FAILED,
        errors: ['Sync timed out - marked as failed'],
        completedAt: new Date(),
      },
    });

    // Create sync log
    const syncLog = await prisma.baselinkerSyncLog.create({
      data: {
        type: syncType,
        status: BaselinkerSyncStatus.RUNNING,
      },
    });

    console.log(`[BaselinkerSync] Starting ${type} sync (logId: ${syncLog.id})`);

    // Run sync in background (don't await)
    this.runSync(syncLog.id, type).catch((error) => {
      console.error('Sync failed:', error);
    });

    return { syncLogId: syncLog.id };
  }

  /**
   * Run the actual sync process
   */
  private async runSync(syncLogId: string, type: string): Promise<void> {
    let itemsProcessed = 0;
    const errors: string[] = [];

    try {
      const stored = await this.getDecryptedToken();
      if (!stored) {
        throw new Error('No Baselinker configuration found');
      }

      const provider = await this.createProvider();

      if (type === 'full') {
        // Full sync: categories → products → images → stock
        const catResult = await this.syncCategories(provider, stored.inventoryId);
        itemsProcessed += catResult.processed;
        errors.push(...catResult.errors);

        const prodResult = await this.syncProducts(provider, stored.inventoryId);
        itemsProcessed += prodResult.processed;
        errors.push(...prodResult.errors);

        const stockResult = await this.syncStock(provider, stored.inventoryId);
        itemsProcessed += stockResult.processed;
        errors.push(...stockResult.errors);

        // Reindex Meilisearch
        await this.reindexMeilisearch();
      } else if (type === 'categories') {
        const result = await this.syncCategories(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        errors.push(...result.errors);
      } else if (type === 'products') {
        const result = await this.syncProducts(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        errors.push(...result.errors);
        await this.reindexMeilisearch();
      } else if (type === 'stock') {
        const result = await this.syncStock(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        errors.push(...result.errors);
      } else if (type === 'images') {
        const result = await this.syncImages(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        errors.push(...result.errors);
      }

      // Update sync log as success
      await prisma.baselinkerSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: errors.length > 0 ? BaselinkerSyncStatus.FAILED : BaselinkerSyncStatus.SUCCESS,
          itemsProcessed,
          errors: errors.length > 0 ? errors : undefined,
          completedAt: new Date(),
        },
      });

      // Update last sync time in config
      await prisma.baselinkerConfig.updateMany({
        data: { lastSyncAt: new Date() },
      });
    } catch (error) {
      console.error('Sync error:', error);

      // Update sync log as failed
      await prisma.baselinkerSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: BaselinkerSyncStatus.FAILED,
          itemsProcessed,
          errors: [error instanceof Error ? error.message : 'Unknown error', ...errors],
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Sync categories from Baselinker (incremental - only changes)
   * Handles flat Baselinker categories with path-like names (e.g., "Odzież/Sport/Bluzy")
   * by extracting the last segment for display name and creating proper slugs
   */
  async syncCategories(
    provider: BaselinkerProvider,
    inventoryId: string
  ): Promise<{ processed: number; errors: string[]; skipped: number }> {
    const errors: string[] = [];
    let processed = 0;
    let skipped = 0;

    try {
      const categories = await provider.getInventoryCategories(inventoryId);
      console.log(`[BaselinkerSync] Fetched ${categories.length} categories from Baselinker`);

      // Pre-fetch all existing categories for comparison
      const existingCategories = await prisma.category.findMany({
        where: { baselinkerCategoryId: { not: null } },
        select: {
          id: true,
          baselinkerCategoryId: true,
          name: true,
          parentId: true,
        },
      });
      
      const existingMap = new Map(
        existingCategories.map(c => [c.baselinkerCategoryId!, c])
      );

      // Pre-build parent ID lookup
      const blCategoryIdToDbId = new Map<string, string>();
      for (const cat of existingCategories) {
        if (cat.baselinkerCategoryId) {
          blCategoryIdToDbId.set(cat.baselinkerCategoryId, cat.id);
        }
      }

      // Helper to extract last segment from path-like name
      const getDisplayName = (fullName: string): string => {
        const parts = fullName.split('/');
        return parts[parts.length - 1].trim() || fullName;
      };

      // Helper to create a unique slug from the full path
      const createSlugFromPath = (fullName: string): string => {
        // Create slug from full path but make it readable with dashes between segments
        const parts = fullName.split('/').map(p => slugify(p.trim())).filter(Boolean);
        return parts.join('-') || 'category';
      };

      // Process only new or changed categories
      const categoriesToProcess: typeof categories = [];
      
      for (const blCategory of categories) {
        const categoryId = blCategory.category_id.toString();
        const existing = existingMap.get(categoryId);
        const displayName = getDisplayName(blCategory.name);
        const expectedParentId = blCategory.parent_id 
          ? blCategoryIdToDbId.get(blCategory.parent_id.toString()) || null
          : null;

        if (existing) {
          // Check if changed (compare with display name, not full path)
          if (existing.name === displayName && existing.parentId === expectedParentId) {
            skipped++;
            continue; // No changes, skip
          }
        }
        
        categoriesToProcess.push(blCategory);
      }

      console.log(`[BaselinkerSync] Processing ${categoriesToProcess.length} changed/new categories (${skipped} unchanged)`);

      // Process only changed categories
      for (const blCategory of categoriesToProcess) {
        try {
          const categoryId = blCategory.category_id.toString();
          const displayName = getDisplayName(blCategory.name);
          const slug = createSlugFromPath(blCategory.name);

          const result = await prisma.category.upsert({
            where: { baselinkerCategoryId: categoryId },
            update: {
              name: displayName,
              slug: await this.ensureUniqueSlug(slug, categoryId),
              parentId: blCategory.parent_id
                ? (await this.findCategoryByBaselinkerIdcatId(blCategory.parent_id.toString()))?.id || null
                : null,
            },
            create: {
              baselinkerCategoryId: categoryId,
              name: displayName,
              slug: await this.ensureUniqueSlug(slug, categoryId),
              parentId: blCategory.parent_id
                ? (await this.findCategoryByBaselinkerIdcatId(blCategory.parent_id.toString()))?.id || null
                : null,
              isActive: true,
            },
          });
          
          // Update lookup for subsequent parent references
          blCategoryIdToDbId.set(categoryId, result.id);
          processed++;
        } catch (error) {
          errors.push(`Category ${blCategory.category_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { processed, errors, skipped };
  }

  /**
   * Find category by Baselinker ID
   */
  private async findCategoryByBaselinkerIdcatId(baselinkerCategoryId: string) {
    return prisma.category.findUnique({
      where: { baselinkerCategoryId },
    });
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(baseSlug: string, baselinkerCategoryId: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.category.findUnique({
        where: { slug },
      });

      if (!existing || existing.baselinkerCategoryId === baselinkerCategoryId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Generate a simple hash for product comparison
   */
  private generateProductHash(blProduct: any): string {
    const data = {
      name: blProduct.text_fields?.pl?.name || blProduct.name || '',
      sku: blProduct.sku || '',
      ean: blProduct.ean || '',
      price: blProduct.price_brutto || 0,
      category_id: blProduct.category_id || 0,
      imageCount: blProduct.images ? Object.keys(blProduct.images).length : 0,
      variantCount: blProduct.variants?.length || 0,
    };
    return JSON.stringify(data);
  }

  /**
   * Sync products from Baselinker (incremental - only changes)
   */
  async syncProducts(
    provider: BaselinkerProvider,
    inventoryId: string
  ): Promise<{ processed: number; errors: string[]; skipped: number }> {
    const errors: string[] = [];
    let processed = 0;
    let skipped = 0;

    try {
      console.log('[BaselinkerSync] Starting incremental products sync...');
      
      // Get all product IDs from Baselinker (lightweight call)
      console.log('[BaselinkerSync] Fetching product list...');
      const productList = await provider.getAllInventoryProducts(inventoryId);
      console.log(`[BaselinkerSync] Found ${productList.length} products in Baselinker`);

      // Pre-fetch existing products with essential data for comparison
      const existingProducts = await prisma.product.findMany({
        where: { baselinkerProductId: { not: null } },
        select: {
          id: true,
          baselinkerProductId: true,
          name: true,
          sku: true,
          barcode: true,
          price: true,
          categoryId: true,
          images: { select: { id: true } },
          variants: { select: { id: true, baselinkerVariantId: true } },
        },
      });

      const existingMap = new Map(
        existingProducts.map(p => [p.baselinkerProductId!, p])
      );

      console.log(`[BaselinkerSync] Found ${existingProducts.length} existing products in database`);

      // First pass: identify which products need updating
      // Compare basic info from productList to reduce API calls
      const productsToFetch: number[] = [];
      
      for (const blProduct of productList) {
        const blId = blProduct.id.toString();
        const existing = existingMap.get(blId);
        
        if (!existing) {
          // New product - needs full fetch
          productsToFetch.push(blProduct.id);
          continue;
        }
        
        // Quick comparison - if basic fields differ, fetch full data
        const priceChanged = existing.price && Math.abs(parseFloat(existing.price.toString()) - (blProduct.price_brutto || 0)) > 0.01;
        const skuChanged = existing.sku !== (blProduct.sku || `BL-${blProduct.id}`);
        const nameChanged = existing.name !== blProduct.name;
        
        if (priceChanged || skuChanged || nameChanged) {
          productsToFetch.push(blProduct.id);
        } else {
          skipped++;
        }
      }

      console.log(`[BaselinkerSync] ${productsToFetch.length} products need updating, ${skipped} unchanged`);

      if (productsToFetch.length === 0) {
        console.log('[BaselinkerSync] No products to update, skipping fetch');
        return { processed: 0, errors, skipped };
      }

      // Fetch detailed data only for changed products
      console.log('[BaselinkerSync] Fetching detailed data for changed products...');
      const products = await provider.getInventoryProductsData(inventoryId, productsToFetch);
      console.log(`[BaselinkerSync] Got ${products.length} product details`);

      // Process in batches of 10 with extended timeout (60 seconds)
      const batchSize = 10;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        console.log(`[BaselinkerSync] Processing products batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);

        await prisma.$transaction(
          async (tx) => {
            for (const blProduct of batch) {
              try {
                const baselinkerProductId = blProduct.id.toString();
              const sku = generateSku(blProduct.id, blProduct.sku);
              const name = blProduct.text_fields?.pl?.name || blProduct.name || `Product ${blProduct.id}`;
              const description = blProduct.text_fields?.pl?.description || '';
              const slug = await this.ensureUniqueProductSlug(slugify(name) || `product-${baselinkerProductId}`, baselinkerProductId);

              // Find category
              const category = blProduct.category_id
                ? await this.findCategoryByBaselinkerIdcatId(blProduct.category_id.toString())
                : null;

              // Upsert product
              const product = await tx.product.upsert({
                where: { baselinkerProductId },
                update: {
                  name,
                  slug,
                  description,
                  sku: await this.ensureUniqueSku(sku, baselinkerProductId),
                  barcode: blProduct.ean || null,
                  price: blProduct.price_brutto || 0,
                  categoryId: category?.id || null,
                  status: 'ACTIVE',
                  specifications: blProduct.features || {},
                },
                create: {
                  baselinkerProductId,
                  name,
                  slug,
                  description,
                  sku: await this.ensureUniqueSku(sku, baselinkerProductId),
                  barcode: blProduct.ean || null,
                  price: blProduct.price_brutto || 0,
                  categoryId: category?.id || null,
                  status: 'ACTIVE',
                  specifications: blProduct.features || {},
                },
              });

              // Sync images
              if (blProduct.images && Object.keys(blProduct.images).length > 0) {
                // Delete existing images
                await tx.productImage.deleteMany({
                  where: { productId: product.id },
                });

                // Create new images
                const imageEntries = Object.entries(blProduct.images).sort(([a], [b]) => parseInt(a) - parseInt(b));
                for (let idx = 0; idx < imageEntries.length; idx++) {
                  const [, url] = imageEntries[idx];
                  await tx.productImage.create({
                    data: {
                      productId: product.id,
                      url: url as string,
                      order: idx,
                    },
                  });
                }
              }

              // Sync variants if they exist
              if (blProduct.variants && blProduct.variants.length > 0) {
                for (const blVariant of blProduct.variants) {
                  const variantId = blVariant.variant_id.toString();
                  const variantSku = generateSku(blVariant.variant_id, blVariant.sku);

                  await tx.productVariant.upsert({
                    where: { baselinkerVariantId: variantId },
                    update: {
                      name: blVariant.name,
                      sku: await this.ensureUniqueVariantSku(variantSku, variantId),
                      barcode: blVariant.ean || null,
                      price: blVariant.price_brutto || blProduct.price_brutto || 0,
                    },
                    create: {
                      baselinkerVariantId: variantId,
                      productId: product.id,
                      name: blVariant.name,
                      sku: await this.ensureUniqueVariantSku(variantSku, variantId),
                      barcode: blVariant.ean || null,
                      price: blVariant.price_brutto || blProduct.price_brutto || 0,
                    },
                  });
                }
              } else {
                // Create default variant for product without variants
                const defaultVariantId = `default-${baselinkerProductId}`;
                await tx.productVariant.upsert({
                  where: { baselinkerVariantId: defaultVariantId },
                  update: {
                    name: 'Domyślny',
                    sku: await this.ensureUniqueVariantSku(`${sku}-DEFAULT`, defaultVariantId),
                    barcode: blProduct.ean || null,
                    price: blProduct.price_brutto || 0,
                  },
                  create: {
                    baselinkerVariantId: defaultVariantId,
                    productId: product.id,
                    name: 'Domyślny',
                    sku: await this.ensureUniqueVariantSku(`${sku}-DEFAULT`, defaultVariantId),
                    barcode: blProduct.ean || null,
                    price: blProduct.price_brutto || 0,
                  },
                });
              }

              processed++;
            } catch (error) {
              errors.push(`Product ${blProduct.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        },
        {
          maxWait: 60000, // 60 seconds max wait to acquire connection
          timeout: 120000, // 2 minutes timeout for the transaction
        });
      }
    } catch (error) {
      errors.push(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { processed, errors, skipped };
  }

  /**
   * Ensure unique product slug
   */
  private async ensureUniqueProductSlug(baseSlug: string, baselinkerProductId: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.product.findUnique({
        where: { slug },
      });

      if (!existing || existing.baselinkerProductId === baselinkerProductId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Ensure unique SKU
   */
  private async ensureUniqueSku(baseSku: string, baselinkerProductId: string): Promise<string> {
    let sku = baseSku;
    let counter = 1;

    while (true) {
      const existing = await prisma.product.findUnique({
        where: { sku },
      });

      if (!existing || existing.baselinkerProductId === baselinkerProductId) {
        return sku;
      }

      sku = `${baseSku}-${counter}`;
      counter++;
    }
  }

  /**
   * Ensure unique variant SKU
   */
  private async ensureUniqueVariantSku(baseSku: string, baselinkerVariantId: string): Promise<string> {
    let sku = baseSku;
    let counter = 1;

    while (true) {
      const existing = await prisma.productVariant.findUnique({
        where: { sku },
      });

      if (!existing || existing.baselinkerVariantId === baselinkerVariantId) {
        return sku;
      }

      sku = `${baseSku}-${counter}`;
      counter++;
    }
  }

  /**
   * Sync stock levels from Baselinker
   */
  async syncStock(
    provider: BaselinkerProvider,
    inventoryId: string
  ): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      const stockEntries = await provider.getInventoryProductsStock(inventoryId);

      // Get default location
      let defaultLocation = await prisma.location.findFirst({
        where: { type: 'WAREHOUSE', isActive: true },
      });

      if (!defaultLocation) {
        defaultLocation = await prisma.location.create({
          data: {
            name: 'Magazyn główny',
            code: 'MAIN',
            type: 'WAREHOUSE',
            isActive: true,
          },
        });
      }

      for (const entry of stockEntries) {
        try {
          const baselinkerProductId = entry.product_id.toString();

          // Find product variant
          const variant = await prisma.productVariant.findFirst({
            where: {
              OR: [
                { baselinkerVariantId: `default-${baselinkerProductId}` },
                { product: { baselinkerProductId } },
              ],
            },
          });

          if (!variant) {
            continue;
          }

          // Calculate total stock from all warehouses
          const totalStock = Object.values(entry.stock as Record<string, number>).reduce((sum: number, qty: number) => sum + qty, 0);
          const totalReserved = Object.values(entry.reservations as Record<string, number>).reduce((sum: number, qty: number) => sum + qty, 0);

          // Upsert inventory
          await prisma.inventory.upsert({
            where: {
              variantId_locationId: {
                variantId: variant.id,
                locationId: defaultLocation.id,
              },
            },
            update: {
              quantity: totalStock,
              reserved: totalReserved,
            },
            create: {
              variantId: variant.id,
              locationId: defaultLocation.id,
              quantity: totalStock,
              reserved: totalReserved,
            },
          });

          processed++;
        } catch (error) {
          errors.push(`Stock ${entry.product_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { processed, errors };
  }

  /**
   * Sync images (standalone, without full product sync)
   */
  async syncImages(
    provider: BaselinkerProvider,
    inventoryId: string
  ): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Get products with their Baselinker IDs
      const products = await prisma.product.findMany({
        where: { baselinkerProductId: { not: null } },
        select: { id: true, baselinkerProductId: true },
      });

      const productIds = products
        .filter((p) => p.baselinkerProductId)
        .map((p) => parseInt(p.baselinkerProductId!, 10));

      // Fetch product data with images
      const blProducts = await provider.getInventoryProductsData(inventoryId, productIds);

      for (const blProduct of blProducts) {
        try {
          const product = products.find((p) => p.baselinkerProductId === blProduct.id.toString());
          if (!product) continue;

          if (blProduct.images && Object.keys(blProduct.images).length > 0) {
            await prisma.productImage.deleteMany({
              where: { productId: product.id },
            });

            const imageEntries = Object.entries(blProduct.images).sort(([a], [b]) => parseInt(a) - parseInt(b));
            for (let idx = 0; idx < imageEntries.length; idx++) {
              const [, url] = imageEntries[idx];
              await prisma.productImage.create({
                data: {
                  productId: product.id,
                  url: url as string,
                  order: idx,
                },
              });
            }
            processed++;
          }
        } catch (error) {
          errors.push(`Images ${blProduct.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to sync images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { processed, errors };
  }

  /**
   * Reindex Meilisearch after sync
   */
  async reindexMeilisearch(): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: {
          category: true,
          images: { orderBy: { order: 'asc' }, take: 1 },
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      });

      const documents = products.map((product) => {
        const totalStock = product.variants.reduce((sum, v) => {
          return sum + v.inventory.reduce((s, inv) => s + inv.quantity - inv.reserved, 0);
        }, 0);

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          price: parseFloat(product.price.toString()),
          categoryId: product.categoryId,
          categoryName: product.category?.name || null,
          image: product.images[0]?.url || null,
          inStock: totalStock > 0,
          stock: totalStock,
        };
      });

      if (documents.length > 0) {
        await meiliClient.index(PRODUCTS_INDEX).addDocuments(documents);
      }
    } catch (error) {
      console.error('Failed to reindex Meilisearch:', error);
    }
  }

  /**
   * Get sync status and recent logs
   */
  async getStatus(limit: number = 10): Promise<SyncStatus> {
    const config = await prisma.baselinkerConfig.findFirst();

    const currentSync = await prisma.baselinkerSyncLog.findFirst({
      where: { status: BaselinkerSyncStatus.RUNNING },
      orderBy: { startedAt: 'desc' },
    });

    const recentLogs = await prisma.baselinkerSyncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return {
      configured: !!config,
      lastSyncAt: config?.lastSyncAt ?? null,
      currentSync: currentSync
        ? {
            id: currentSync.id,
            type: currentSync.type,
            status: currentSync.status,
            startedAt: currentSync.startedAt,
          }
        : null,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        type: log.type,
        status: log.status,
        itemsProcessed: log.itemsProcessed,
        errors: log.errors,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
      })),
    };
  }
}

// Export singleton instance
export const baselinkerService = new BaselinkerService();
