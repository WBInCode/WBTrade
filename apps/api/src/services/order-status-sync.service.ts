/**
 * Order Status Sync Service
 * 
 * Synchronizes order statuses FROM Baselinker TO our database.
 * When a worker changes status in Baselinker (e.g., "Wysłano", "Dostarczono"),
 * this service updates the corresponding order in our shop.
 */

import { prisma } from '../db';
import { decryptToken } from '../lib/encryption';
import { createBaselinkerProvider } from '../providers/baselinker';
import type { BaselinkerOrderResponse } from '../providers/baselinker/baselinker-provider.interface';
import { OrderStatus } from '@prisma/client';

// ============================================
// Baselinker Status ID Mapping
// ============================================

/**
 * Maps Baselinker status IDs to our shop order statuses
 * These IDs are specific to WB-Trade Baselinker configuration
 * 
 * Lista statusów z Baselinkera:
 * 65342 - "Nowe zamówienia" (opłacone, potwierdzone)
 * 65344 - "Wysłane"
 * 65804 - "AUT. SORT. WYSYŁEK"
 * 65815 - "Brak w magazynie"
 * 65816 - "Zwroty/Anulowa"
 * 65817 - "Do HP"
 * 65818 - "Do ikonka"
 * 65819 - "Do BTP"
 * 65820 - "Zamówione"
 * 65823 - "Nieopłacone"
 * 67214 - "Magazyn własny"
 * 109553 - "Zam. Wys. własna"
 * 110412 - "DO PRZESYŁKI"
 * 117968 - "Archiwum" (dostarczone/zakończone)
 */
const BL_STATUS_TO_SHOP_STATUS: Record<number, OrderStatus> = {
  // Statusy zamówień
  65823: 'OPEN',        // "Nieopłacone" 
  65342: 'CONFIRMED',   // "Nowe zamówienia" (opłacone)
  
  // Realizacja / Pakowanie
  65804: 'PROCESSING',  // "AUT. SORT. WYSYŁEK"
  110412: 'PROCESSING', // "DO PRZESYŁKI"
  65817: 'PROCESSING',  // "Do HP"
  65818: 'PROCESSING',  // "Do ikonka"
  65819: 'PROCESSING',  // "Do BTP"
  65820: 'PROCESSING',  // "Zamówione" (zamówione u dostawcy)
  67214: 'PROCESSING',  // "Magazyn własny"
  109553: 'PROCESSING', // "Zam. Wys. własna"
  
  // Wysłane
  65344: 'SHIPPED',     // "Wysłane"
  
  // Zakończone / Dostarczone
  117968: 'DELIVERED',  // "Archiwum" (zarchiwizowane = dostarczone)
  
  // Anulowane / Zwroty
  65816: 'REFUNDED',    // "Zwroty/Anulowa" - zwroty klientów
  65815: 'CANCELLED',   // "Brak w magazynie" (traktowane jako anulowane)
};

// Shipping status names in Baselinker (case-insensitive matching)
const SHIPPING_STATUS_KEYWORDS: Record<string, OrderStatus> = {
  'wysłano': 'SHIPPED',
  'wyslano': 'SHIPPED',
  'shipped': 'SHIPPED',
  'w drodze': 'SHIPPED',
  'nadano': 'SHIPPED',
  'dostarczono': 'DELIVERED',
  'delivered': 'DELIVERED',
  'odebrano': 'DELIVERED',
  'zrealizowano': 'DELIVERED',
  'anulowano': 'CANCELLED',
  'cancelled': 'CANCELLED',
  'zwrot': 'REFUNDED',
  'refunded': 'REFUNDED',
  'w realizacji': 'PROCESSING',
  'pakowanie': 'PROCESSING',
  'processing': 'PROCESSING',
};

// ============================================
// Types
// ============================================

export interface StatusSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

interface OrderStatusUpdate {
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  baselinkerOrderId: string;
  trackingNumber?: string;
}

// ============================================
// Service Class
// ============================================

export class OrderStatusSyncService {
  private statusNameCache: Map<number, string> = new Map();

  /**
   * Sync order statuses from Baselinker
   * Fetches orders changed in the last N hours and updates local database
   */
  async syncOrderStatuses(hoursBack: number = 24): Promise<StatusSyncResult> {
    const result: StatusSyncResult = { synced: 0, skipped: 0, errors: [] };

    try {
      // Get Baselinker configuration
      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) {
        result.errors.push('Baselinker not configured');
        return result;
      }

      const apiToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      const provider = createBaselinkerProvider({
        apiToken,
        inventoryId: config.inventoryId,
      });

      // Get orders from last N hours
      const dateFrom = Math.floor(Date.now() / 1000) - (hoursBack * 60 * 60);
      const blOrders = await provider.getOrders({ date_from: dateFrom });

      console.log(`[OrderStatusSync] Fetched ${blOrders.length} orders from Baselinker (last ${hoursBack}h)`);

      // Get all our orders that are synced to Baselinker
      const ourOrders = await prisma.order.findMany({
        where: {
          baselinkerOrderId: { not: null },
          status: { notIn: ['DELIVERED', 'REFUNDED', 'CANCELLED'] }, // Only sync active orders
        },
        select: {
          id: true,
          orderNumber: true,
          baselinkerOrderId: true,
          status: true,
          trackingNumber: true,
        },
      });

      // Create lookup map
      const ourOrdersMap = new Map(
        ourOrders.map(o => [o.baselinkerOrderId!, o])
      );

      // Process each Baselinker order
      for (const blOrder of blOrders) {
        const blOrderId = String(blOrder.order_id);
        const ourOrder = ourOrdersMap.get(blOrderId);

        if (!ourOrder) {
          // Order not from our shop, skip
          continue;
        }

        try {
          const newStatus = await this.mapBaselinkerStatus(blOrder, provider);
          
          if (!newStatus) {
            result.skipped++;
            continue;
          }

          if (newStatus === ourOrder.status) {
            // Status unchanged
            result.skipped++;
            continue;
          }

          // Update order status
          await this.updateOrderStatus({
            orderId: ourOrder.id,
            oldStatus: ourOrder.status,
            newStatus,
            baselinkerOrderId: blOrderId,
            trackingNumber: blOrder.delivery_point_id || undefined,
          });

          console.log(`[OrderStatusSync] Order ${ourOrder.orderNumber}: ${ourOrder.status} -> ${newStatus}`);
          result.synced++;

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Order ${blOrderId}: ${errorMsg}`);
        }
      }

      console.log(`[OrderStatusSync] Completed: synced=${result.synced}, skipped=${result.skipped}, errors=${result.errors.length}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      console.error('[OrderStatusSync] Error:', error);
    }

    return result;
  }

  /**
   * Map Baselinker order to our shop status
   */
  private async mapBaselinkerStatus(
    blOrder: BaselinkerOrderResponse,
    provider: ReturnType<typeof createBaselinkerProvider>
  ): Promise<OrderStatus | null> {
    const statusId = blOrder.order_status_id;

    // Check direct status ID mapping first
    if (BL_STATUS_TO_SHOP_STATUS[statusId]) {
      return BL_STATUS_TO_SHOP_STATUS[statusId];
    }

    // Get status name from Baselinker (cached)
    let statusName: string | undefined = this.statusNameCache.get(statusId);
    
    if (!statusName) {
      // We need to get status list from Baselinker
      // For now, we'll try to match by order properties
      const fetchedName = await this.getStatusNameFromOrder(blOrder);
      if (fetchedName) {
        statusName = fetchedName;
        this.statusNameCache.set(statusId, statusName);
      }
    }

    if (statusName) {
      const normalizedName = statusName.toLowerCase();
      for (const [keyword, status] of Object.entries(SHIPPING_STATUS_KEYWORDS)) {
        if (normalizedName.includes(keyword)) {
          return status;
        }
      }
    }

    // Fallback: check if tracking number exists = SHIPPED
    if (blOrder.delivery_point_id) {
      return 'SHIPPED';
    }

    return null;
  }

  /**
   * Try to determine status from order data
   */
  private async getStatusNameFromOrder(blOrder: BaselinkerOrderResponse): Promise<string | null> {
    // This is a placeholder - ideally we would call getOrderStatusList API
    // For now, return null and rely on status ID mapping
    return null;
  }

  /**
   * Update order status in database
   */
  private async updateOrderStatus(update: OrderStatusUpdate): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update order
      const updateData: any = {
        status: update.newStatus,
      };

      // Set tracking number if provided and shipping
      if (update.trackingNumber && update.newStatus === 'SHIPPED') {
        updateData.trackingNumber = update.trackingNumber;
      }

      await tx.order.update({
        where: { id: update.orderId },
        data: updateData,
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: update.orderId,
          status: update.newStatus,
          note: `Status zsynchronizowany z Baselinkera (BL status -> ${update.newStatus})`,
        },
      });
    });

    // TODO: Send email notification for SHIPPED/DELIVERED status changes
  }

  /**
   * Sync status for a single order by Baselinker ID
   */
  async syncSingleOrder(baselinkerOrderId: string): Promise<{
    success: boolean;
    oldStatus?: OrderStatus;
    newStatus?: OrderStatus;
    error?: string;
  }> {
    try {
      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) {
        return { success: false, error: 'Baselinker not configured' };
      }

      const apiToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      const provider = createBaselinkerProvider({
        apiToken,
        inventoryId: config.inventoryId,
      });

      // Get specific order from Baselinker
      const orders = await provider.getOrders({ 
        order_id: parseInt(baselinkerOrderId, 10) 
      });

      if (orders.length === 0) {
        return { success: false, error: 'Order not found in Baselinker' };
      }

      const blOrder = orders[0];

      // Find our order
      const ourOrder = await prisma.order.findFirst({
        where: { baselinkerOrderId },
        select: { id: true, status: true, orderNumber: true },
      });

      if (!ourOrder) {
        return { success: false, error: 'Order not found in our database' };
      }

      const newStatus = await this.mapBaselinkerStatus(blOrder, provider);

      if (!newStatus) {
        return { success: false, error: 'Could not map Baselinker status' };
      }

      if (newStatus === ourOrder.status) {
        return { success: true, oldStatus: ourOrder.status, newStatus, error: 'Status unchanged' };
      }

      await this.updateOrderStatus({
        orderId: ourOrder.id,
        oldStatus: ourOrder.status,
        newStatus,
        baselinkerOrderId,
      });

      console.log(`[OrderStatusSync] Order ${ourOrder.orderNumber}: ${ourOrder.status} -> ${newStatus}`);

      return { success: true, oldStatus: ourOrder.status, newStatus };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get Baselinker order statuses list
   * Useful for mapping configuration
   */
  async getBaselinkerStatuses(): Promise<Array<{ id: number; name: string; color: string }>> {
    try {
      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) {
        throw new Error('Baselinker not configured');
      }

      const apiToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      const response = await fetch('https://api.baselinker.com/connector.php', {
        method: 'POST',
        headers: {
          'X-BLToken': apiToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          method: 'getOrderStatusList',
          parameters: JSON.stringify({}),
        }),
      });

      const data = await response.json();
      
      if (data.status === 'SUCCESS' && data.statuses) {
        return Object.entries(data.statuses).map(([id, status]: [string, any]) => ({
          id: parseInt(id, 10),
          name: status.name,
          color: status.color || '#000000',
        }));
      }

      return [];
    } catch (error) {
      console.error('[OrderStatusSync] Error fetching statuses:', error);
      return [];
    }
  }
}

// Export singleton instance
export const orderStatusSyncService = new OrderStatusSyncService();
