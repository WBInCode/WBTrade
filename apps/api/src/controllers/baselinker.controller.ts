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

      // Validate sync interval if provided
      if (syncIntervalMinutes !== undefined) {
        const interval = parseInt(syncIntervalMinutes, 10);
        if (isNaN(interval) || interval < 5 || interval > 1440) {
          return res.status(400).json({
            message: 'Sync interval must be between 5 and 1440 minutes',
          });
        }
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
      const { type } = req.body; // 'full', 'products', 'categories', 'stock', 'images'

      const validTypes = ['full', 'products', 'categories', 'stock', 'images'];
      const syncType = type || 'full';

      if (!validTypes.includes(syncType)) {
        return res.status(400).json({
          message: `Invalid sync type. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      const result = await baselinkerService.triggerSync(syncType);

      res.json({
        message: `Sync ${syncType} started`,
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
};
