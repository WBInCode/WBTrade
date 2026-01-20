/**
 * Baselinker Controller
 * 
 * Handles admin API endpoints for Baselinker integration:
 * - Configuration management (save/get/delete)
 * - Connection testing
 * - Manual sync triggers
 * - Sync status and logs
 */

import { Request, Response } from 'express';
import { baselinkerService } from '../services/baselinker.service';

export const baselinkerController = {
  /**
   * POST /api/admin/baselinker/config
   * Save Baselinker configuration (encrypts API token)
   */
  async saveConfig(req: Request, res: Response) {
    try {
      const { apiToken, inventoryId, syncEnabled, syncIntervalMinutes } = req.body;

      // Check if config already exists
      const existingConfig = await baselinkerService.getConfig();

      // Validate required fields - apiToken is required only for new config
      if (!inventoryId) {
        return res.status(400).json({
          message: 'Inventory ID is required',
        });
      }

      // For new config, apiToken is required
      if (!existingConfig && !apiToken) {
        return res.status(400).json({
          message: 'API token is required for initial configuration',
        });
      }

      // Validate inventory ID format
      if (!/^\d+$/.test(inventoryId)) {
        return res.status(400).json({
          message: 'Inventory ID must be a numeric string',
        });
      }

      const config = await baselinkerService.saveConfig({
        apiToken,
        inventoryId,
        syncEnabled: syncEnabled ?? true,
        syncIntervalMinutes: syncIntervalMinutes ?? 60,
      });

      res.json({
        message: 'Configuration saved successfully',
        config,
      });
    } catch (error) {
      console.error('Error saving Baselinker config:', error);
      res.status(500).json({
        message: 'Failed to save configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * GET /api/admin/baselinker/config
   * Get current configuration (token is masked)
   */
  async getConfig(req: Request, res: Response) {
    try {
      const config = await baselinkerService.getConfig();

      if (!config) {
        return res.status(404).json({
          message: 'No Baselinker configuration found',
          configured: false,
        });
      }

      res.json({
        configured: true,
        config,
      });
    } catch (error) {
      console.error('Error fetching Baselinker config:', error);
      res.status(500).json({
        message: 'Failed to fetch configuration',
      });
    }
  },

  /**
   * DELETE /api/admin/baselinker/config
   * Remove Baselinker integration
   */
  async deleteConfig(req: Request, res: Response) {
    try {
      await baselinkerService.deleteConfig();

      res.json({
        message: 'Baselinker configuration deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting Baselinker config:', error);
      res.status(500).json({
        message: 'Failed to delete configuration',
      });
    }
  },

  /**
   * POST /api/admin/baselinker/test
   * Test connection to Baselinker API
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { apiToken } = req.body;

      // Use provided token or stored token
      const result = await baselinkerService.testConnection(apiToken);

      if (result.success) {
        res.json({
          success: true,
          message: 'Connection successful',
          inventories: result.inventories,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Connection failed',
        });
      }
    } catch (error) {
      console.error('Error testing Baselinker connection:', error);
      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * POST /api/admin/baselinker/sync
   * Trigger manual sync
   */
  async triggerSync(req: Request, res: Response) {
    try {
      const { type, mode } = req.body; 
      // type: 'full', 'products', 'categories', 'stock', 'images'
      // mode: 'new-only' (tylko nowe produkty, bez stanów 0), 'update-only' (tylko aktualizacja istniejących)

      const validTypes = ['full', 'products', 'categories', 'stock', 'images'];
      const validModes = ['new-only', 'update-only', 'fetch-all', undefined];
      const syncType = type || 'full';

      if (!validTypes.includes(syncType)) {
        return res.status(400).json({
          message: `Invalid sync type. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      if (mode && !validModes.includes(mode)) {
        return res.status(400).json({
          message: `Invalid sync mode. Must be one of: new-only, update-only`,
        });
      }

      const result = await baselinkerService.triggerSync(syncType, mode);

      res.json({
        message: `Sync ${syncType} started${mode ? ` (${mode})` : ''}`,
        syncLogId: result.syncLogId,
      });
    } catch (error) {
      console.error('Error triggering Baselinker sync:', error);
      res.status(500).json({
        message: 'Failed to trigger sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * GET /api/admin/baselinker/status
   * Get sync status and recent logs
   */
  async getStatus(req: Request, res: Response) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 100);

      const status = await baselinkerService.getStatus(limit);

      res.json(status);
    } catch (error) {
      console.error('Error fetching Baselinker status:', error);
      res.status(500).json({
        message: 'Failed to fetch status',
      });
    }
  },

  /**
   * GET /api/admin/baselinker/inventories
   * Get list of available inventories from Baselinker
   */
  async getInventories(req: Request, res: Response) {
    try {
      const inventories = await baselinkerService.getInventories();

      res.json({
        inventories,
      });
    } catch (error) {
      console.error('Error fetching Baselinker inventories:', error);
      res.status(500).json({
        message: 'Failed to fetch inventories',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * DELETE /api/admin/baselinker/sync/:id
   * Cancel/delete a sync log (mark as failed or remove)
   */
  async cancelSync(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          message: 'Sync ID is required',
        });
      }

      const result = await baselinkerService.cancelSync(id);

      res.json({
        message: 'Sync cancelled successfully',
        result,
      });
    } catch (error) {
      console.error('Error cancelling sync:', error);
      res.status(500).json({
        message: 'Failed to cancel sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * POST /api/admin/baselinker/send-order/:orderId
   * Manually send specific order to BaseLinker
   */
  async sendOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          message: 'Order ID is required',
        });
      }

      console.log(`[BaselinkerController] Manual order send requested for ${orderId}`);
      const result = await baselinkerService.sendOrderToBaselinker(orderId);

      if (result.success) {
        res.json({
          message: 'Order sent to BaseLinker successfully',
          baselinkerOrderId: result.baselinkerOrderId,
        });
      } else {
        res.status(500).json({
          message: 'Failed to send order to BaseLinker',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error sending order to BaseLinker:', error);
      res.status(500).json({
        message: 'Failed to send order',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * POST /api/admin/baselinker/sync-stock/:variantId
   * Manually sync stock for specific variant to BaseLinker
   */
  async syncStock(req: Request, res: Response) {
    try {
      const { variantId } = req.params;

      if (!variantId) {
        return res.status(400).json({
          message: 'Variant ID is required',
        });
      }

      console.log(`[BaselinkerController] Manual stock sync requested for ${variantId}`);
      const result = await baselinkerService.syncStockToBaselinker(variantId);

      if (result.success) {
        res.json({
          message: 'Stock synced to BaseLinker successfully',
        });
      } else {
        res.status(500).json({
          message: 'Failed to sync stock to BaseLinker',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error syncing stock to BaseLinker:', error);
      res.status(500).json({
        message: 'Failed to sync stock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * POST /api/admin/baselinker/sync-all-stock
   * Sync all product stocks to BaseLinker (batch operation)
   */
  async syncAllStock(req: Request, res: Response) {
    try {
      console.log('[BaselinkerController] Batch stock sync requested');
      
      // Get all active product variants
      const { prisma } = await import('../db');
      const variants = await prisma.productVariant.findMany({
        where: {
          product: { status: 'ACTIVE' },
        },
        select: { id: true },
        take: 1000, // Limit to prevent timeout
      });

      console.log(`[BaselinkerController] Found ${variants.length} variants to sync`);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Sync in batches to avoid overwhelming BaseLinker API
      for (const variant of variants) {
        try {
          const result = await baselinkerService.syncStockToBaselinker(variant.id);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${variant.id}: ${result.error}`);
          }
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failCount++;
          errors.push(`${variant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: 'Batch stock sync completed',
        total: variants.length,
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      });
    } catch (error) {
      console.error('Error in batch stock sync:', error);
      res.status(500).json({
        message: 'Failed to sync stocks',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
