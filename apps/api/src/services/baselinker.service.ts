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
import { BaselinkerSyncType, BaselinkerSyncStatus, Prisma, PriceChangeSource } from '@prisma/client';
import { priceHistoryService } from './price-history.service';

// ============================================
// Types
// ============================================

export interface SaveConfigInput {
  apiToken?: string;  // Optional for updates (keep existing token)
  inventoryId: string;
  syncEnabled?: boolean;
  syncIntervalMinutes?: number;
}

export interface ConfigOutput {
  inventoryId: string;
  tokenMasked: string;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
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
    errors: Prisma.JsonValue;
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
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
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
    const { apiToken, inventoryId, syncEnabled = true, syncIntervalMinutes = 60 } = input;

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
          syncEnabled,
          syncIntervalMinutes,
        },
        create: {
          inventoryId,
          apiTokenEncrypted: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          authTag: encrypted.authTag,
          syncEnabled,
          syncIntervalMinutes,
        },
      });

      return {
        inventoryId: config.inventoryId,
        tokenMasked: maskToken(apiToken),
        syncEnabled: config.syncEnabled,
        syncIntervalMinutes: config.syncIntervalMinutes,
        lastSyncAt: config.lastSyncAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } else if (existingConfig) {
      // Update only sync settings
      config = await prisma.baselinkerConfig.update({
        where: { id: existingConfig.id },
        data: {
          syncEnabled,
          syncIntervalMinutes,
        },
      });
      
      const decryptedToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      return {
        inventoryId: config.inventoryId,
        tokenMasked: maskToken(decryptedToken),
        syncEnabled: config.syncEnabled,
        syncIntervalMinutes: config.syncIntervalMinutes,
        lastSyncAt: config.lastSyncAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
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
        syncEnabled: config.syncEnabled,
        syncIntervalMinutes: config.syncIntervalMinutes,
        lastSyncAt: config.lastSyncAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } catch (error) {
      // Token encryption key changed - config is invalid
      // NIE usuwamy konfiguracji - klucz szyfrowania może zostać naprawiony
      console.error('Failed to decrypt Baselinker config - check BASELINKER_ENCRYPTION_KEY env var. Config NOT deleted.');
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
      // NIE usuwamy konfiguracji - klucz szyfrowania może zostać naprawiony
      console.error('Failed to decrypt Baselinker token - check BASELINKER_ENCRYPTION_KEY env var. Config NOT deleted.');
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
   * @param type - 'full', 'products', 'categories', 'stock', 'images'
   * @param mode - 'new-only' (tylko nowe produkty, bez stanów 0), 'update-only' (tylko aktualizacja istniejących)
   */
  async triggerSync(type: string, mode?: string): Promise<SyncTriggerResult> {
    // Map string type to enum
    const typeMap: Record<string, BaselinkerSyncType> = {
      full: BaselinkerSyncType.PRODUCTS,
      products: BaselinkerSyncType.PRODUCTS,
      categories: BaselinkerSyncType.CATEGORIES,
      stock: BaselinkerSyncType.STOCK,
      images: BaselinkerSyncType.IMAGES,
      price: BaselinkerSyncType.PRICE,
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

    console.log(`[BaselinkerSync] Starting ${type} sync (logId: ${syncLog.id})${mode ? ` with mode: ${mode}` : ''}`);

    // Run sync in background (don't await)
    this.runSync(syncLog.id, type, mode).catch((error) => {
      console.error('Sync failed:', error);
    });

    return { syncLogId: syncLog.id };
  }

  /**
   * Run the actual sync process
   * @param mode - 'new-only' (tylko nowe produkty, bez stanów 0), 'update-only' (tylko aktualizacja istniejących)
   */
  private async runSync(syncLogId: string, type: string, mode?: string): Promise<void> {
    let itemsProcessed = 0;
    let itemsChanged = 0;
    let allChangedSkus: { sku: string; oldQty: number; newQty: number; inventory: string }[] = [];
    let allChangedProducts: { sku: string; name: string; changes: string[] }[] = [];
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

        const prodResult = await this.syncProducts(provider, stored.inventoryId, mode);
        itemsProcessed += prodResult.processed;
        allChangedProducts.push(...prodResult.changedProducts);
        errors.push(...prodResult.errors);

        const stockResult = await this.syncStock(provider, stored.inventoryId);
        itemsProcessed += stockResult.processed;
        itemsChanged += stockResult.changed;
        allChangedSkus.push(...stockResult.changedSkus);
        errors.push(...stockResult.errors);

        // Reindex Meilisearch
        await this.reindexMeilisearch();
      } else if (type === 'categories') {
        const result = await this.syncCategories(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        errors.push(...result.errors);
      } else if (type === 'products') {
        const result = await this.syncProducts(provider, stored.inventoryId, mode);
        itemsProcessed = result.processed;
        allChangedProducts = result.changedProducts;
        errors.push(...result.errors);
        
        // Po synchronizacji produktów, synchronizuj też stany magazynowe
        console.log('[BaselinkerSync] Syncing stock after products sync...');
        const stockResult = await this.syncStock(provider, stored.inventoryId);
        itemsProcessed += stockResult.processed;
        itemsChanged += stockResult.changed;
        allChangedSkus.push(...stockResult.changedSkus);
        errors.push(...stockResult.errors);
        
        await this.reindexMeilisearch();
      } else if (type === 'stock') {
        const result = await this.syncStock(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        itemsChanged = result.changed;
        allChangedSkus = result.changedSkus;
        errors.push(...result.errors);
      } else if (type === 'images') {
        const result = await this.syncImages(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        errors.push(...result.errors);
      } else if (type === 'price') {
        const result = await this.syncPrices(provider, stored.inventoryId);
        itemsProcessed = result.processed;
        itemsChanged = result.changed;
        allChangedSkus = result.changedPrices as any;
        errors.push(...result.errors);
      }

      // Update sync log as success
      const changedData = allChangedSkus.length > 0 ? allChangedSkus : (allChangedProducts.length > 0 ? allChangedProducts : undefined);
      await prisma.baselinkerSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: errors.length > 0 ? BaselinkerSyncStatus.FAILED : BaselinkerSyncStatus.SUCCESS,
          itemsProcessed,
          itemsChanged: itemsChanged || allChangedProducts.length,
          changedSkus: changedData,
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
          itemsChanged,
          changedSkus: allChangedSkus.length > 0 ? allChangedSkus : undefined,
          errors: [error instanceof Error ? error.message : 'Unknown error', ...errors],
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Run stock sync directly (awaited) — for use by BullMQ worker
   * Creates sync log, runs sync, updates log with results
   */
  async runStockSyncDirect(): Promise<{ syncLogId: string; success: boolean; itemsProcessed: number; itemsChanged: number }> {
    // Clean up stuck syncs
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

    const syncLog = await prisma.baselinkerSyncLog.create({
      data: {
        type: BaselinkerSyncType.STOCK,
        status: BaselinkerSyncStatus.RUNNING,
      },
    });

    console.log(`[BaselinkerSync] Starting direct stock sync (logId: ${syncLog.id})`);

    try {
      const stored = await this.getDecryptedToken();
      if (!stored) throw new Error('No Baselinker configuration found');

      const provider = await this.createProvider();
      const result = await this.syncStock(provider, stored.inventoryId);

      const status = result.errors.length > 0 ? BaselinkerSyncStatus.FAILED : BaselinkerSyncStatus.SUCCESS;

      await prisma.baselinkerSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status,
          itemsProcessed: result.processed,
          itemsChanged: result.changed,
          changedSkus: result.changedSkus.length > 0 ? result.changedSkus : undefined,
          errors: result.errors.length > 0 ? result.errors : undefined,
          completedAt: new Date(),
        },
      });

      await prisma.baselinkerConfig.updateMany({
        data: { lastSyncAt: new Date() },
      });

      console.log(`[BaselinkerSync] Direct stock sync complete: ${result.processed} processed, ${result.changed} changed`);

      return {
        syncLogId: syncLog.id,
        success: result.errors.length === 0,
        itemsProcessed: result.processed,
        itemsChanged: result.changed,
      };
    } catch (error) {
      console.error('[BaselinkerSync] Direct stock sync error:', error);

      await prisma.baselinkerSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: BaselinkerSyncStatus.FAILED,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          completedAt: new Date(),
        },
      });

      return { syncLogId: syncLog.id, success: false, itemsProcessed: 0, itemsChanged: 0 };
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
          baselinkerCategoryPath: true,
          name: true,
          slug: true,
          parentId: true,
        },
      });
      
      const existingMap = new Map(
        existingCategories.map(c => [c.baselinkerCategoryId as string, c])
      );

      // Map to store main category name -> category id (for parent lookup)
      const mainCategoryMap = new Map<string, string>();
      
      // First, find or create all main categories (those without | in name OR parent_id = 0)
      const mainCategories = categories.filter(c => 
        !c.name.includes('|') || c.parent_id === 0
      );
      
      console.log(`[BaselinkerSync] Found ${mainCategories.length} main categories (without | separator)`);

      // Process main categories first
      for (const blCategory of mainCategories) {
        const categoryId = blCategory.category_id.toString();
        const categoryName = blCategory.name.trim();
        const existing = existingMap.get(categoryId);
        
        // Check if unchanged
        if (existing && existing.name === categoryName && existing.parentId === null) {
          mainCategoryMap.set(categoryName, existing.id);
          skipped++;
          continue;
        }
        
        try {
          const slug = slugify(categoryName) || `category-${categoryId}`;
          
          const result = await prisma.category.upsert({
            where: { baselinkerCategoryId: categoryId },
            update: {
              name: categoryName,
              slug: await this.ensureUniqueSlug(slug, categoryId),
              parentId: null, // Main categories have no parent
              baselinkerCategoryPath: categoryName, // Path is just the name for main categories
            },
            create: {
              baselinkerCategoryId: categoryId,
              name: categoryName,
              slug: await this.ensureUniqueSlug(slug, categoryId),
              parentId: null,
              baselinkerCategoryPath: categoryName,
              isActive: true,
            },
          });
          
          mainCategoryMap.set(categoryName, result.id);
          processed++;
        } catch (error) {
          errors.push(`Main category ${categoryId} (${categoryName}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Now process subcategories (those with | separator)
      const subCategories = categories.filter(c => c.name.includes('|'));
      console.log(`[BaselinkerSync] Found ${subCategories.length} subcategories (with | separator)`);

      for (const blCategory of subCategories) {
        const categoryId = blCategory.category_id.toString();
        const fullPath = blCategory.name.trim(); // e.g. "Gastronomia|Naczynia i przybory kuchenne"
        
        // Parse the category path
        const parts = fullPath.split('|').map(p => p.trim());
        const mainCategoryName = parts[0]; // "Gastronomia"
        const subCategoryName = parts.slice(1).join('|'); // "Naczynia i przybory kuchenne" (or further nested)
        
        const existing = existingMap.get(categoryId);
        
        // Find parent category by name (case-insensitive)
        let parentId = mainCategoryMap.get(mainCategoryName) || null;
        
        // If parent not found in map, try case-insensitive lookup
        if (!parentId) {
          // Try case-insensitive lookup in our map
          for (const [name, id] of mainCategoryMap.entries()) {
            if (name.toLowerCase() === mainCategoryName.toLowerCase()) {
              parentId = id;
              mainCategoryMap.set(mainCategoryName, parentId); // Cache for future lookups
              break;
            }
          }
        }
        
        // If still not found, try to find by name in DB (case-insensitive)
        if (!parentId) {
          const parentCategory = await prisma.category.findFirst({
            where: { 
              name: { equals: mainCategoryName, mode: 'insensitive' },
              parentId: null, // Must be a main category
            },
          });
          if (parentCategory) {
            parentId = parentCategory.id;
            mainCategoryMap.set(mainCategoryName, parentId);
          }
        }
        
        // Check if unchanged
        if (existing && 
            existing.name === subCategoryName && 
            existing.parentId === parentId &&
            existing.baselinkerCategoryPath === fullPath) {
          skipped++;
          continue;
        }
        
        try {
          // Create slug from subcategory name only (parent is in hierarchy)
          const slug = slugify(subCategoryName) || `subcategory-${categoryId}`;
          
          const result = await prisma.category.upsert({
            where: { baselinkerCategoryId: categoryId },
            update: {
              name: subCategoryName, // Only the subcategory part
              slug: await this.ensureUniqueSlug(slug, categoryId),
              parentId: parentId,
              baselinkerCategoryPath: fullPath, // Full path for reference
            },
            create: {
              baselinkerCategoryId: categoryId,
              name: subCategoryName,
              slug: await this.ensureUniqueSlug(slug, categoryId),
              parentId: parentId,
              baselinkerCategoryPath: fullPath,
              isActive: true,
            },
          });
          
          processed++;
          
          // Log if parent not found
          if (!parentId) {
            console.warn(`[BaselinkerSync] Warning: Parent category "${mainCategoryName}" not found for subcategory "${subCategoryName}" (ID: ${categoryId})`);
          }
        } catch (error) {
          errors.push(`Subcategory ${categoryId} (${fullPath}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log(`[BaselinkerSync] Categories sync complete. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors.length}`);
    } catch (error) {
      errors.push(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { processed, errors, skipped };
  }

  /**
   * Find category by Baselinker ID
   * Searches for exact match first, then tries with common prefixes (btp-, hp-)
   */
  private async findCategoryByBaselinkerIdcatId(baselinkerCategoryId: string) {
    // Try exact match first
    let category = await prisma.category.findUnique({
      where: { baselinkerCategoryId },
    });
    
    if (category) return category;
    
    // Try with btp- prefix
    category = await prisma.category.findUnique({
      where: { baselinkerCategoryId: `btp-${baselinkerCategoryId}` },
    });
    
    if (category) return category;
    
    // Try with hp- prefix
    category = await prisma.category.findUnique({
      where: { baselinkerCategoryId: `hp-${baselinkerCategoryId}` },
    });
    
    return category;
  }
  
  /**
   * Find category by Baselinker category path (e.g. "Gastronomia|Naczynia i przybory kuchenne")
   */
  async findCategoryByPath(categoryPath: string): Promise<{ id: string } | null> {
    // First try to find by exact path
    let category = await prisma.category.findFirst({
      where: { baselinkerCategoryPath: categoryPath },
      select: { id: true },
    });
    
    if (category) return category;
    
    // If not found and path contains |, try to find the subcategory by name
    if (categoryPath.includes('|')) {
      const parts = categoryPath.split('|').map(p => p.trim());
      const subCategoryName = parts.slice(1).join('|');
      const mainCategoryName = parts[0];
      
      // Find parent first
      const parent = await prisma.category.findFirst({
        where: { 
          name: mainCategoryName,
          parentId: null,
        },
        select: { id: true },
      });
      
      if (parent) {
        category = await prisma.category.findFirst({
          where: { 
            name: subCategoryName,
            parentId: parent.id,
          },
          select: { id: true },
        });
      }
    }
    
    return category;
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(baseSlug: string, baselinkerCategoryId: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (counter < 10000) {
      const existing = await prisma.category.findUnique({
        where: { slug },
      });

      if (!existing || existing.baselinkerCategoryId === baselinkerCategoryId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Fallback if we somehow hit the limit
    return `${baseSlug}-${Date.now()}`;
  }

  /**
   * Get product name from Baselinker product data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getProductName(blProduct: any): string {
    if (blProduct.text_fields) {
      // Direct name field (most common)
      if (blProduct.text_fields.name) {
        return blProduct.text_fields.name;
      }
      // Try Polish
      if (blProduct.text_fields['pl']?.name) {
        return blProduct.text_fields['pl'].name;
      }
      // Try any language
      for (const langCode of Object.keys(blProduct.text_fields)) {
        const textField = blProduct.text_fields[langCode];
        if (typeof textField === 'object' && textField?.name) {
          return textField.name;
        }
      }
    }
    if (blProduct.name) {
      return blProduct.name;
    }
    return '';
  }

  /**
   * Get product description from Baselinker product data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getProductDescription(blProduct: any): string {
    if (blProduct.text_fields) {
      // Direct description field
      if (blProduct.text_fields.description) {
        return blProduct.text_fields.description;
      }
      // Try Polish
      if (blProduct.text_fields['pl']?.description) {
        return blProduct.text_fields['pl'].description;
      }
      // Try any language
      for (const langCode of Object.keys(blProduct.text_fields)) {
        const textField = blProduct.text_fields[langCode];
        if (typeof textField === 'object' && textField?.description) {
          return textField.description;
        }
      }
    }
    return '';
  }

  /**
   * Default PLN price group ID - fetched from BaseLinker config
   * Common IDs: 10034 for PLN, but this should match your inventory settings
   */
  private defaultPriceGroupId = '10034'; // PLN price group

  /**
   * Round price to .99 ending (e.g., 12.34 → 12.99, 50.00 → 50.99)
   * This makes prices more attractive psychologically
   */
  private roundPriceTo99(price: number): number {
    if (price <= 0) return 0;
    return Math.floor(price) + 0.99;
  }

  /**
   * Get product price from Baselinker product data
   * BaseLinker can return prices in different fields:
   * - price_brutto: direct price (simple products)
   * - prices: object with price groups { group_id: price } (inventory products)
   * 
   * Priority:
   * 1. price_brutto (if exists)
   * 2. Default PLN price group (ID 10034)
   * 3. First non-zero price from any group
   * 4. price_netto + tax
   * 
   * All prices are rounded to .99 ending
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getProductPrice(blProduct: any): number {
    let rawPrice = 0;

    // First try direct price_brutto
    if (blProduct.price_brutto && parseFloat(blProduct.price_brutto) > 0) {
      rawPrice = parseFloat(blProduct.price_brutto);
    }
    // Try prices object (inventory price groups)
    else if (blProduct.prices && typeof blProduct.prices === 'object') {
      // Priority 1: Default PLN price group
      const plnPrice = blProduct.prices[this.defaultPriceGroupId];
      if (plnPrice && parseFloat(plnPrice) > 0) {
        rawPrice = parseFloat(plnPrice);
      } else {
        // Priority 2: First non-zero price (fallback)
        for (const [groupId, price] of Object.entries(blProduct.prices)) {
          const numPrice = parseFloat(String(price));
          if (numPrice > 0) {
            console.log(`[BaselinkerSync] Using price from group ${groupId} (not default PLN): ${numPrice}`);
            rawPrice = numPrice;
            break;
          }
        }
      }
    }
    // Try price_netto + tax
    else if (blProduct.price_netto && parseFloat(blProduct.price_netto) > 0) {
      const taxRate = blProduct.tax_rate || 23; // Default VAT 23%
      rawPrice = parseFloat(blProduct.price_netto) * (1 + taxRate / 100);
    }
    
    // Round to .99 ending
    return this.roundPriceTo99(rawPrice);
  }

  /**
   * Get product EAN/barcode from Baselinker product data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getProductEan(blProduct: any): string | null {
    // Direct ean field
    if (blProduct.ean && String(blProduct.ean).trim()) {
      return String(blProduct.ean).trim();
    }
    
    // Sometimes EAN is in text_fields or other places
    if (blProduct.text_fields?.ean) {
      return String(blProduct.text_fields.ean).trim();
    }
    
    return null;
  }

  /**
   * Generate a simple hash for product comparison
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generateProductHash(blProduct: any): string {
    const data = {
      name: this.getProductName(blProduct),
      sku: blProduct.sku || '',
      ean: this.getProductEan(blProduct) || '',
      price: this.getProductPrice(blProduct),
      category_id: blProduct.category_id || 0,
      imageCount: blProduct.images ? Object.keys(blProduct.images).length : 0,
      variantCount: blProduct.variants?.length || 0,
    };
    return JSON.stringify(data);
  }

  /**
   * Sync products from Baselinker (incremental - only changes)
   * @param mode - 'new-only' (tylko nowe produkty, bez stanów 0), 'update-only' (tylko aktualizacja istniejących), undefined (wszystko)
   */
  async syncProducts(
    provider: BaselinkerProvider,
    inventoryId: string,
    mode?: string
  ): Promise<{ processed: number; errors: string[]; skipped: number; changedProducts: { sku: string; name: string; changes: string[] }[] }> {
    const errors: string[] = [];
    let processed = 0;
    let skipped = 0;
    const changedProducts: { sku: string; name: string; changes: string[] }[] = [];

    try {
      console.log(`[BaselinkerSync] Starting products sync with mode: ${mode || 'all'}...`);
      
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
        existingProducts.map(p => [p.baselinkerProductId as string, p])
      );

      console.log(`[BaselinkerSync] Found ${existingProducts.length} existing products in database`);

      // First pass: identify which products need updating based on mode
      const productsToFetch: number[] = [];
      
      // Dla trybu new-only, pobieramy też stany magazynowe aby pominąć produkty z zerowym stanem
      let stockMap: Map<number, number> | null = null;
      if (mode === 'new-only') {
        console.log('[BaselinkerSync] Fetching stock data for new-only mode...');
        const stockEntries = await provider.getInventoryProductsStock(inventoryId);
        stockMap = new Map();
        for (const entry of stockEntries) {
          const totalStock = Object.values(entry.stock as Record<string, number>).reduce((sum: number, qty: number) => sum + qty, 0);
          stockMap.set(entry.product_id, totalStock);
        }
        console.log(`[BaselinkerSync] Got stock data for ${stockMap.size} products`);
      }
      
      for (const blProduct of productList) {
        const blId = blProduct.id.toString();
        const existing = existingMap.get(blId);
        
        // MODE: fetch-all - pobierz wszystkie produkty (inicjalizacja)
        if (mode === 'fetch-all') {
          // Skip only if product already exists
          if (existing) {
            skipped++;
            continue;
          }
          // Pobierz wszystkie nowe produkty, nawet ze stanem 0
          productsToFetch.push(blProduct.id);
          continue;
        }
        
        // MODE: new-only - tylko nowe produkty, bez stanów zerowych
        if (mode === 'new-only') {
          // Skip if product already exists
          if (existing) {
            skipped++;
            continue;
          }
          
          // Skip if stock is 0
          const productStock = stockMap?.get(blProduct.id) ?? 0;
          if (productStock <= 0) {
            skipped++;
            continue;
          }
          
          productsToFetch.push(blProduct.id);
          continue;
        }
        
        // MODE: update-only - tylko aktualizacja istniejących
        if (mode === 'update-only') {
          // Skip if product does not exist
          if (!existing) {
            skipped++;
            continue;
          }
          
          productsToFetch.push(blProduct.id);
          continue;
        }
        
        // MODE: all (default) - standardowa logika inkrementalna
        if (!existing) {
          // New product - needs full fetch
          productsToFetch.push(blProduct.id);
          continue;
        }
        
        // Quick comparison - if basic fields differ, fetch full data
        const listPrice = this.getProductPrice(blProduct);
        const priceChanged = existing.price && Math.abs(parseFloat(existing.price.toString()) - listPrice) > 0.01;
        const skuChanged = existing.sku !== (blProduct.sku || `BL-${blProduct.id}`);
        const nameChanged = existing.name !== blProduct.name;
        
        if (priceChanged || skuChanged || nameChanged) {
          productsToFetch.push(blProduct.id);
        } else {
          skipped++;
        }
      }

      console.log(`[BaselinkerSync] ${productsToFetch.length} products to process, ${skipped} skipped (mode: ${mode || 'all'})`);

      if (productsToFetch.length === 0) {
        console.log('[BaselinkerSync] No products to process, skipping fetch');
        return { processed: 0, errors, skipped, changedProducts };
      }

      // Fetch detailed data only for changed products
      console.log('[BaselinkerSync] Fetching detailed data for products...');
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
              
              // Get name and description using helper methods
              let name = this.getProductName(blProduct);
              if (!name) {
                name = `Product ${blProduct.id}`;
                console.log(`[BaselinkerSync] Warning: No name found for product ${blProduct.id}, using fallback`);
              }
              const description = this.getProductDescription(blProduct);
              const productPrice = this.getProductPrice(blProduct);
              const productEan = this.getProductEan(blProduct);
              
              // Debug log for price issues
              if (productPrice === 0) {
                console.log(`[BaselinkerSync] Warning: Product ${blProduct.id} has price 0. Raw data:`, {
                  price_brutto: blProduct.price_brutto,
                  price_wholesale_netto: blProduct.price_wholesale_netto,
                });
              }
              
              const slug = await this.ensureUniqueProductSlug(slugify(name) || `product-${baselinkerProductId}`, baselinkerProductId);

              // Find category by Baselinker category_id
              // Category in Baselinker has ID, and our Category has baselinkerCategoryId field
              const category = blProduct.category_id
                ? await this.findCategoryByBaselinkerIdcatId(blProduct.category_id.toString())
                : null;
              
              // Get baselinker category path for product record (from the category if found)
              let baselinkerCategoryPath: string | null = null;
              if (category) {
                const catWithPath = await prisma.category.findUnique({
                  where: { id: category.id },
                  select: { baselinkerCategoryPath: true },
                });
                baselinkerCategoryPath = catWithPath?.baselinkerCategoryPath || null;
              }

              // Get tags (trim whitespace from each tag)
              const productTags = (blProduct.tags || []).map((tag: string) => tag.trim()).filter(Boolean);

              // Check if product exists
              const existingProduct = await tx.product.findUnique({
                where: { baselinkerProductId },
                select: { id: true, price: true, name: true, sku: true, barcode: true, description: true, categoryId: true },
              });

              let product;
              
              if (existingProduct) {
                // Track what changed
                const productChanges: string[] = [];
                if (existingProduct.name !== name) productChanges.push(`Nazwa: "${existingProduct.name}" → "${name}"`);
                const existingSku = existingProduct.sku;
                const newSku = await this.ensureUniqueSku(sku, baselinkerProductId);
                if (existingSku !== newSku) productChanges.push(`SKU: ${existingSku} → ${newSku}`);
                if (existingProduct.barcode !== productEan) productChanges.push(`EAN: ${existingProduct.barcode || 'brak'} → ${productEan || 'brak'}`);
                const currentPrice = Number(existingProduct.price);
                if (Math.abs(currentPrice - productPrice) > 0.01) productChanges.push(`Cena: ${currentPrice.toFixed(2)} → ${productPrice.toFixed(2)} zł`);
                if (existingProduct.categoryId !== (category?.id || null)) productChanges.push('Kategoria zmieniona');
                
                // Product exists - update without price first
                product = await tx.product.update({
                  where: { baselinkerProductId },
                  data: {
                    name,
                    slug,
                    description,
                    sku: newSku,
                    barcode: productEan,
                    categoryId: category?.id || null,
                    baselinkerCategoryPath: baselinkerCategoryPath,
                    status: 'ACTIVE',
                    specifications: blProduct.features || {},
                    tags: productTags,
                  },
                });
                
                if (productChanges.length > 0) {
                  changedProducts.push({ sku: newSku, name, changes: productChanges });
                }
                
                // Handle price change with Omnibus compliance
                if (Math.abs(currentPrice - productPrice) > 0.01) {
                  // Schedule price update with history (will be executed after tx)
                  await priceHistoryService.updateProductPrice({
                    productId: existingProduct.id,
                    newPrice: productPrice,
                    source: PriceChangeSource.BASELINKER,
                    reason: 'Baselinker sync',
                  });
                }
              } else {
                // New product - create with initial price (no history needed)
                product = await tx.product.create({
                  data: {
                    baselinkerProductId,
                    name,
                    slug,
                    description,
                    sku: await this.ensureUniqueSku(sku, baselinkerProductId),
                    barcode: productEan,
                    price: productPrice,
                    lowestPrice30Days: productPrice, // Initial lowest = current price
                    lowestPrice30DaysAt: new Date(),
                    categoryId: category?.id || null,
                    baselinkerCategoryPath: baselinkerCategoryPath,
                    status: 'ACTIVE',
                    specifications: blProduct.features || {},
                    tags: productTags,
                  },
                });
              }

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
                  // Round variant price to .99 ending (use product price if variant has no price)
                  const rawVariantPrice = blVariant.price_brutto || productPrice;
                  const variantPrice = this.roundPriceTo99(rawVariantPrice);
                  const variantEan = blVariant.ean ? String(blVariant.ean).trim() : null;

                  // Check if variant exists
                  const existingVariant = await tx.productVariant.findUnique({
                    where: { baselinkerVariantId: variantId },
                    select: { id: true, price: true },
                  });

                  if (existingVariant) {
                    // Variant exists - update without price
                    await tx.productVariant.update({
                      where: { baselinkerVariantId: variantId },
                      data: {
                        name: blVariant.name,
                        sku: await this.ensureUniqueVariantSku(variantSku, variantId),
                        barcode: variantEan,
                      },
                    });
                    
                    // Handle price change with Omnibus compliance
                    const currentVariantPrice = Number(existingVariant.price);
                    if (currentVariantPrice !== variantPrice) {
                      await priceHistoryService.updateVariantPrice({
                        variantId: existingVariant.id,
                        newPrice: variantPrice,
                        source: PriceChangeSource.BASELINKER,
                        reason: 'Baselinker sync',
                      });
                    }
                  } else {
                    // New variant - create with initial price
                    await tx.productVariant.create({
                      data: {
                        baselinkerVariantId: variantId,
                        productId: product.id,
                        name: blVariant.name,
                        sku: await this.ensureUniqueVariantSku(variantSku, variantId),
                        barcode: variantEan,
                        price: variantPrice,
                        lowestPrice30Days: variantPrice,
                        lowestPrice30DaysAt: new Date(),
                      },
                    });
                  }
                }
              } else {
                // Create default variant for product without variants
                const defaultVariantId = `default-${baselinkerProductId}`;
                
                // Check if default variant exists
                const existingDefaultVariant = await tx.productVariant.findUnique({
                  where: { baselinkerVariantId: defaultVariantId },
                  select: { id: true, price: true },
                });

                if (existingDefaultVariant) {
                  // Update default variant without price
                  await tx.productVariant.update({
                    where: { baselinkerVariantId: defaultVariantId },
                    data: {
                      name: 'Domyślny',
                      sku: await this.ensureUniqueVariantSku(`${sku}-DEFAULT`, defaultVariantId),
                      barcode: productEan,
                    },
                  });
                  
                  // Handle price change with Omnibus compliance
                  const currentDefaultPrice = Number(existingDefaultVariant.price);
                  if (currentDefaultPrice !== productPrice) {
                    await priceHistoryService.updateVariantPrice({
                      variantId: existingDefaultVariant.id,
                      newPrice: productPrice,
                      source: PriceChangeSource.BASELINKER,
                      reason: 'Baselinker sync - default variant',
                    });
                  }
                } else {
                  // Create new default variant
                  await tx.productVariant.create({
                    data: {
                      baselinkerVariantId: defaultVariantId,
                      productId: product.id,
                      name: 'Domyślny',
                      sku: await this.ensureUniqueVariantSku(`${sku}-DEFAULT`, defaultVariantId),
                      barcode: productEan,
                      price: productPrice,
                      lowestPrice30Days: productPrice,
                      lowestPrice30DaysAt: new Date(),
                    },
                  });
                }
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

    return { processed, errors, skipped, changedProducts };
  }

  /**
   * Ensure unique product slug
   */
  private async ensureUniqueProductSlug(baseSlug: string, baselinkerProductId: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (counter < 10000) {
      const existing = await prisma.product.findUnique({
        where: { slug },
      });

      if (!existing || existing.baselinkerProductId === baselinkerProductId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Fallback if we hit the limit
    return `${baseSlug}-${Date.now()}`;
  }

  /**
   * Ensure unique SKU
   */
  private async ensureUniqueSku(baseSku: string, baselinkerProductId: string): Promise<string> {
    let sku = baseSku;
    let counter = 1;

    while (counter < 10000) {
      const existing = await prisma.product.findUnique({
        where: { sku },
      });

      if (!existing || existing.baselinkerProductId === baselinkerProductId) {
        return sku;
      }

      sku = `${baseSku}-${counter}`;
      counter++;
    }
    
    // Fallback if we hit the limit
    return `${baseSku}-${Date.now()}`;
  }

  /**
   * Ensure unique variant SKU
   */
  private async ensureUniqueVariantSku(baseSku: string, baselinkerVariantId: string): Promise<string> {
    let sku = baseSku;
    let counter = 1;

    while (counter < 10000) {
      const existing = await prisma.productVariant.findUnique({
        where: { sku },
      });

      if (!existing || existing.baselinkerVariantId === baselinkerVariantId) {
        return sku;
      }

      sku = `${baseSku}-${counter}`;
      counter++;
    }
    
    // Fallback if we hit the limit
    return `${baseSku}-${Date.now()}`;
  }

  /**
   * Sync stock levels from Baselinker
   * Iterates over ALL inventories to match products with prefixed baselinkerProductId
   */
  async syncStock(
    provider: BaselinkerProvider,
    inventoryId: string
  ): Promise<{ processed: number; errors: string[]; changed: number; changedSkus: { sku: string; oldQty: number; newQty: number; inventory: string }[] }> {
    const errors: string[] = [];
    let processed = 0;
    let changed = 0;
    const changedSkus: { sku: string; oldQty: number; newQty: number; inventory: string }[] = [];

    try {
      // Get default location by code MAIN
      let defaultLocation = await prisma.location.findFirst({
        where: { code: 'MAIN', type: 'WAREHOUSE', isActive: true },
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

      // Fetch all inventories to sync stock from each one
      const inventories = await provider.getInventories();
      
      // Map inventory name to prefix used in baselinkerProductId
      const inventoryPrefixMap: Record<string, string> = {
        'HP': 'hp-',
        'BTP': 'btp-',
        'Leker': 'leker-',
        'ikonka': '', // ikonka products have no prefix
        'Główny': '', // Main inventory - no prefix
      };

      for (const inv of inventories) {
        // Skip non-product inventories (empik, zwroty) and ikonka/Główny
        if (inv.name.includes('empik') || inv.name.includes('zwrot') || inv.name === 'ikonka' || inv.name === 'Główny') {
          console.log(`[BaselinkerSync] Skipping inventory: ${inv.name}`);
          continue;
        }

        const prefix = inventoryPrefixMap[inv.name] ?? '';
        console.log(`[BaselinkerSync] Syncing stock from inventory: ${inv.name} (${inv.inventory_id}), prefix: "${prefix}"`);

        try {
          const stockEntries = await provider.getInventoryProductsStock(inv.inventory_id.toString());
          console.log(`[BaselinkerSync] Fetched ${stockEntries.length} stock entries from ${inv.name}`);

          // === OPTIMIZATION: Batch processing instead of individual queries ===
          
          // 1. Collect all IDs we need to look up
          const prefixedIds = stockEntries.map(entry => {
            const numericId = entry.product_id.toString();
            return prefix ? `${prefix}${numericId}` : numericId;
          });
          const numericIds = stockEntries.map(entry => entry.product_id.toString());

          // 2. Batch fetch all variants in ONE query
          const searchConditions = prefix
            ? [
                { baselinkerVariantId: { in: prefixedIds } },
                { product: { baselinkerProductId: { in: prefixedIds } } },
              ]
            : [
                { baselinkerVariantId: { in: numericIds.map(id => `default-${id}`) } },
                { baselinkerVariantId: { in: numericIds } },
                { product: { baselinkerProductId: { in: numericIds } } },
              ];

          const allVariants = await prisma.productVariant.findMany({
            where: { OR: searchConditions },
            select: { id: true, sku: true, baselinkerVariantId: true, product: { select: { baselinkerProductId: true } } },
          });

          // 3. Build lookup maps for O(1) access
          const variantByBlId = new Map<string, { id: string; sku: string | null }>();
          for (const v of allVariants) {
            if (v.baselinkerVariantId) {
              variantByBlId.set(v.baselinkerVariantId, { id: v.id, sku: v.sku });
            }
            if (v.product?.baselinkerProductId) {
              // Also map by product's baselinkerProductId for products without explicit variant ID
              if (!variantByBlId.has(v.product.baselinkerProductId)) {
                variantByBlId.set(v.product.baselinkerProductId, { id: v.id, sku: v.sku });
              }
            }
          }

          // 4. Batch fetch existing inventory records
          const variantIds = allVariants.map(v => v.id);
          const existingInventories = await prisma.inventory.findMany({
            where: {
              variantId: { in: variantIds },
              locationId: defaultLocation.id,
            },
            select: { variantId: true, quantity: true },
          });

          const inventoryByVariantId = new Map<string, number>();
          for (const inv of existingInventories) {
            inventoryByVariantId.set(inv.variantId, inv.quantity);
          }

          // 5. Process entries and collect upsert operations
          const upsertOps: { variantId: string; quantity: number; reserved: number; sku: string; oldQty: number }[] = [];

          for (const entry of stockEntries) {
            const numericId = entry.product_id.toString();
            const prefixedId = prefix ? `${prefix}${numericId}` : numericId;

            // Try to find variant using our maps
            let variant = variantByBlId.get(prefixedId);
            if (!variant && !prefix) {
              variant = variantByBlId.get(`default-${numericId}`) || variantByBlId.get(numericId);
            }

            if (!variant) continue;

            const totalStock = Object.values((entry.stock || {}) as Record<string, number>).reduce((sum: number, qty: number) => sum + qty, 0);
            const totalReserved = Object.values((entry.reservations || {}) as Record<string, number>).reduce((sum: number, qty: number) => sum + qty, 0);
            const oldQty = inventoryByVariantId.get(variant.id) ?? 0;

            upsertOps.push({
              variantId: variant.id,
              quantity: totalStock,
              reserved: totalReserved,
              sku: variant.sku || prefixedId,
              oldQty,
            });
          }

          // 6. Execute upserts in batches using transaction
          const BATCH_SIZE = 500;
          for (let i = 0; i < upsertOps.length; i += BATCH_SIZE) {
            const batch = upsertOps.slice(i, i + BATCH_SIZE);
            
            await prisma.$transaction(
              batch.map(op => 
                prisma.inventory.upsert({
                  where: {
                    variantId_locationId: {
                      variantId: op.variantId,
                      locationId: defaultLocation.id,
                    },
                  },
                  update: {
                    quantity: op.quantity,
                    reserved: op.reserved,
                  },
                  create: {
                    variantId: op.variantId,
                    locationId: defaultLocation.id,
                    quantity: op.quantity,
                    reserved: op.reserved,
                  },
                })
              )
            );

            // Track changes
            for (const op of batch) {
              if (op.oldQty !== op.quantity) {
                changed++;
                changedSkus.push({
                  sku: op.sku,
                  oldQty: op.oldQty,
                  newQty: op.quantity,
                  inventory: inv.name,
                });
              }
              processed++;
            }

            if (i + BATCH_SIZE < upsertOps.length) {
              console.log(`[BaselinkerSync] Processed ${i + BATCH_SIZE}/${upsertOps.length} from ${inv.name}`);
            }
          }

          console.log(`[BaselinkerSync] Completed ${inv.name}: ${upsertOps.length} variants processed`);
        } catch (error) {
          errors.push(`Failed to fetch stock from ${inv.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch inventories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log(`[BaselinkerSync] Stock sync complete: ${processed} processed, ${changed} changed, ${errors.length} errors`);
    return { processed, errors, changed, changedSkus };
  }

  /**
   * Sync product prices from Baselinker (standalone, without full product sync)
   * Fetches prices from all inventories and updates product/variant prices with Omnibus compliance
   */
  async syncPrices(
    provider: BaselinkerProvider,
    inventoryId: string
  ): Promise<{ processed: number; errors: string[]; changed: number; changedPrices: { sku: string; oldPrice: number; newPrice: number; inventory: string }[] }> {
    const errors: string[] = [];
    let processed = 0;
    let changed = 0;
    const changedPrices: { sku: string; oldPrice: number; newPrice: number; inventory: string }[] = [];

    try {
      const inventories = await provider.getInventories();

      const inventoryPrefixMap: Record<string, string> = {
        'HP': 'hp-',
        'BTP': 'btp-',
        'Leker': 'leker-',
        'ikonka': '',
        'Główny': '',
      };

      for (const inv of inventories) {
        if (inv.name.includes('empik') || inv.name.includes('zwrot')) {
          continue;
        }

        const prefix = inventoryPrefixMap[inv.name] ?? '';
        console.log(`[BaselinkerSync] Syncing prices from inventory: ${inv.name} (${inv.inventory_id}), prefix: "${prefix}"`);

        try {
          // Fetch prices for all products in this inventory
          const pricesMap = await provider.getInventoryProductsPrices(inv.inventory_id.toString());
          console.log(`[BaselinkerSync] Fetched prices for ${Object.keys(pricesMap).length} products from ${inv.name}`);

          for (const [productIdStr, priceGroups] of Object.entries(pricesMap)) {
            try {
              const numericId = productIdStr;
              const prefixedId = prefix ? `${prefix}${numericId}` : numericId;

              // Extract price — same logic as getProductPrice but from priceGroups
              let rawPrice = 0;
              const plnPrice = priceGroups[this.defaultPriceGroupId];
              if (plnPrice && plnPrice > 0) {
                rawPrice = plnPrice;
              } else {
                for (const [, price] of Object.entries(priceGroups)) {
                  if (price > 0) {
                    rawPrice = price;
                    break;
                  }
                }
              }

              const newPrice = this.roundPriceTo99(rawPrice);
              if (newPrice <= 0) continue;

              // Find product by baselinkerProductId
              const product = await prisma.product.findFirst({
                where: { baselinkerProductId: prefixedId },
                select: { id: true, price: true, sku: true },
              });

              if (product) {
                const currentPrice = Number(product.price);
                if (Math.abs(currentPrice - newPrice) > 0.01) {
                  await priceHistoryService.updateProductPrice({
                    productId: product.id,
                    newPrice,
                    source: PriceChangeSource.BASELINKER,
                    reason: 'Baselinker price sync',
                  });
                  changed++;
                  changedPrices.push({
                    sku: product.sku || prefixedId,
                    oldPrice: currentPrice,
                    newPrice,
                    inventory: inv.name,
                  });
                }
                processed++;
              }

              // Also update variant prices
              const searchConditions = prefix
                ? [{ baselinkerVariantId: prefixedId }]
                : [
                    { baselinkerVariantId: `default-${numericId}` },
                    { baselinkerVariantId: numericId },
                  ];

              const variant = await prisma.productVariant.findFirst({
                where: { OR: searchConditions },
                select: { id: true, price: true, sku: true },
              });

              if (variant) {
                const currentVariantPrice = Number(variant.price);
                if (Math.abs(currentVariantPrice - newPrice) > 0.01) {
                  await priceHistoryService.updateVariantPrice({
                    variantId: variant.id,
                    newPrice,
                    source: PriceChangeSource.BASELINKER,
                    reason: 'Baselinker price sync',
                  });
                  if (!product) {
                    changed++;
                    changedPrices.push({
                      sku: variant.sku || prefixedId,
                      oldPrice: currentVariantPrice,
                      newPrice,
                      inventory: inv.name,
                    });
                  }
                }
              }
            } catch (error) {
              errors.push(`Price ${productIdStr}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        } catch (error) {
          errors.push(`Failed to fetch prices from ${inv.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch inventories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log(`[BaselinkerSync] Price sync complete: ${processed} processed, ${changed} changed, ${errors.length} errors`);
    return { processed, errors, changed, changedPrices };
  }

  /**
   * Run price sync directly (awaited) — for use by BullMQ worker
   */
  async runPriceSyncDirect(): Promise<{ syncLogId: string; success: boolean; itemsProcessed: number; itemsChanged: number }> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.baselinkerSyncLog.updateMany({
      where: {
        status: BaselinkerSyncStatus.RUNNING,
        startedAt: { lt: thirtyMinutesAgo },
      },
      data: {
        status: BaselinkerSyncStatus.FAILED,
        errors: ['Sync przekroczył limit 30 minut — oznaczony jako błąd'],
        completedAt: new Date(),
      },
    });

    const syncLog = await prisma.baselinkerSyncLog.create({
      data: {
        type: BaselinkerSyncType.PRICE,
        status: BaselinkerSyncStatus.RUNNING,
      },
    });

    console.log(`[BaselinkerSync] Starting direct price sync (logId: ${syncLog.id})`);

    try {
      const stored = await this.getDecryptedToken();
      if (!stored) throw new Error('No Baselinker configuration found');

      const provider = await this.createProvider();
      const result = await this.syncPrices(provider, stored.inventoryId);

      const status = result.errors.length > 0 ? BaselinkerSyncStatus.FAILED : BaselinkerSyncStatus.SUCCESS;

      await prisma.baselinkerSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status,
          itemsProcessed: result.processed,
          itemsChanged: result.changed,
          changedSkus: result.changedPrices.length > 0 ? result.changedPrices : undefined,
          errors: result.errors.length > 0 ? result.errors : undefined,
          completedAt: new Date(),
        },
      });

      await prisma.baselinkerConfig.updateMany({
        data: { lastSyncAt: new Date() },
      });

      console.log(`[BaselinkerSync] Direct price sync complete: ${result.processed} processed, ${result.changed} changed`);

      return {
        syncLogId: syncLog.id,
        success: result.errors.length === 0,
        itemsProcessed: result.processed,
        itemsChanged: result.changed,
      };
    } catch (error) {
      console.error('[BaselinkerSync] Direct price sync failed:', error);
      await prisma.baselinkerSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: BaselinkerSyncStatus.FAILED,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          completedAt: new Date(),
        },
      });
      return { syncLogId: syncLog.id, success: false, itemsProcessed: 0, itemsChanged: 0 };
    }
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
        .map((p) => parseInt(p.baselinkerProductId as string, 10));

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
  async getStatus(limit = 10): Promise<SyncStatus> {
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

  /**
   * Cancel a running sync or delete a sync log
   */
  async cancelSync(syncId: string): Promise<{ cancelled: boolean; deleted: boolean }> {
    const syncLog = await prisma.baselinkerSyncLog.findUnique({
      where: { id: syncId },
    });

    if (!syncLog) {
      throw new Error('Sync log not found');
    }

    // If sync is running, mark it as failed
    if (syncLog.status === BaselinkerSyncStatus.RUNNING) {
      await prisma.baselinkerSyncLog.update({
        where: { id: syncId },
        data: {
          status: BaselinkerSyncStatus.FAILED,
          errors: ['Cancelled by user'],
          completedAt: new Date(),
        },
      });
      console.log(`[BaselinkerSync] Sync ${syncId} cancelled by user`);
      return { cancelled: true, deleted: false };
    }

    // If sync is already completed/failed, delete the log
    await prisma.baselinkerSyncLog.delete({
      where: { id: syncId },
    });
    console.log(`[BaselinkerSync] Sync log ${syncId} deleted by user`);
    return { cancelled: false, deleted: true };
  }

  /**
   * Send order to Baselinker
   * @param orderId - Order ID from our database
   */
  async sendOrderToBaselinker(orderId: string): Promise<{ success: boolean; baselinkerOrderId?: string; error?: string }> {
    try {
      // TODO: Implement order sending to Baselinker
      // This would require adding order-related methods to the Baselinker provider
      console.log(`[BaselinkerService] Sending order ${orderId} to Baselinker - not yet implemented`);
      return {
        success: false,
        error: 'Order sending to Baselinker is not yet implemented',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync stock for a specific variant to Baselinker
   * @param variantId - Product variant ID
   */
  async syncStockToBaselinker(variantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implement stock update to Baselinker
      // This would require adding stock update methods to the Baselinker provider
      console.log(`[BaselinkerService] Syncing stock for variant ${variantId} to Baselinker - not yet implemented`);
      return {
        success: false,
        error: 'Stock sync to Baselinker is not yet implemented',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const baselinkerService = new BaselinkerService();
