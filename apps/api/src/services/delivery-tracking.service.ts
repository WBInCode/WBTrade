/**
 * Delivery Tracking Service
 * 
 * Fetches package/shipment info from Baselinker for orders
 * and updates delivery status fields (tracking number, link, courier status).
 * 
 * This bridges the gap between Baselinker order statuses and
 * actual courier/InPost delivery statuses.
 */

import { prisma } from '../db';
import { decryptToken } from '../lib/encryption';
import { createBaselinkerProvider } from '../providers/baselinker';
import type { BaselinkerOrderPackage } from '../providers/baselinker/baselinker-provider.interface';

// ============================================
// Delivery Status Labels (Polish)
// ============================================

/**
 * Maps courier tracking status codes to human-readable Polish labels.
 * These are displayed to customers in their order view.
 * 
 * InPost tracking statuses (from Baselinker):
 * - adopted_at_source_branch: Przyjęta w oddziale nadawczym
 * - sent_from_source_branch: Wysłana z oddziału nadawczego
 * - in_transit: W transporcie
 * - out_for_delivery: Wydana do doręczenia
 * - ready_to_pickup: Gotowa do odbioru (w paczkomacie)
 * - delivered: Dostarczona
 * - returned_to_sender: Zwrócona do nadawcy
 * - avizo: Awizowana
 * - claimed: Reklamacja
 * - other: Inny status
 */
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  // InPost Paczkomat
  'created': 'Przesyłka utworzona',
  'offers_prepared': 'Oferta przygotowana',
  'offer_selected': 'Oferta wybrana',
  'confirmed': 'Potwierdzona',
  'dispatched_by_sender': 'Nadana przez nadawcę',
  'collected_from_sender': 'Odebrana od nadawcy',
  'taken_by_courier': 'Pobrana przez kuriera',
  'adopted_at_source_branch': 'W oddziale nadawczym',
  'sent_from_source_branch': 'Wysłana z oddziału',
  'ready_to_pickup_from_pok': 'Gotowa do odbioru w punkcie',
  'ready_to_pickup_from_pok_registered': 'Gotowa do odbioru (zarejestrowana)',
  'oversized': 'Przesyłka ponadgabarytowa',
  'in_transit': 'W transporcie',
  'out_for_delivery': 'Wydana do doręczenia',
  'ready_to_pickup': 'Gotowa do odbioru w paczkomacie',
  'pickup_reminder_sent': 'Wysłano przypomnienie o odbiorze',
  'delivered': 'Dostarczona / Odebrana',
  'pickup_time_expired': 'Czas odbioru minął',
  'avizo': 'Awizowana',
  'claimed': 'Reklamacja',
  'returned_to_sender': 'Zwrócona do nadawcy',
  'canceled': 'Anulowana',
  'other': 'W trakcie realizacji',

  // DPD / DHL / other couriers (generic)
  'picked_up': 'Odebrana od nadawcy',
  'in_delivery': 'W doręczeniu',
  'not_delivered': 'Nie doręczono',
  'stored': 'Przechowywana w magazynie',

  // Fallback
  'unknown': 'Status nieznany',
  'shipped': 'Wysłana',
};

/**
 * Maps delivery status keys to order-level significance.
 * Used to automatically update OrderStatus based on delivery progress.
 */
export const DELIVERY_STATUS_TO_ORDER_STATUS: Record<string, string> = {
  'dispatched_by_sender': 'SHIPPED',
  'collected_from_sender': 'SHIPPED',
  'taken_by_courier': 'SHIPPED',
  'adopted_at_source_branch': 'SHIPPED',
  'sent_from_source_branch': 'SHIPPED',
  'in_transit': 'SHIPPED',
  'out_for_delivery': 'SHIPPED',
  'ready_to_pickup': 'SHIPPED',        // Paczka w paczkomacie - still SHIPPED in our enum
  'ready_to_pickup_from_pok': 'SHIPPED',
  'delivered': 'DELIVERED',
  'returned_to_sender': 'CANCELLED',
  'canceled': 'CANCELLED',
};

// ============================================
// Types
// ============================================

export interface DeliveryTrackingResult {
  updated: number;
  skipped: number;
  errors: string[];
}

export interface PackageInfo {
  courierCode: string;
  trackingNumber: string;
  trackingLink: string | null;
  deliveryStatus: string | null;
  isSent: boolean;
}

// ============================================
// Service
// ============================================

export class DeliveryTrackingService {
  
  /**
   * Fetch and update delivery status for all active shipped/processing orders.
   * Called by the cron worker every 15 minutes.
   */
  async syncDeliveryStatuses(): Promise<DeliveryTrackingResult> {
    const result: DeliveryTrackingResult = { updated: 0, skipped: 0, errors: [] };

    try {
      // Get Baselinker config
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

      // Get orders that need delivery tracking
      // Focus on SHIPPED and PROCESSING orders with a Baselinker ID
      const orders = await prisma.order.findMany({
        where: {
          baselinkerOrderId: { not: null },
          status: { in: ['PROCESSING', 'SHIPPED', 'CONFIRMED'] },
        },
        select: {
          id: true,
          orderNumber: true,
          baselinkerOrderId: true,
          status: true,
          trackingNumber: true,
          deliveryStatus: true,
          courierCode: true,
        },
      });

      console.log(`[DeliveryTracking] Checking ${orders.length} orders for delivery updates`);

      // Process each order - fetch packages from Baselinker
      for (const order of orders) {
        try {
          const packageInfo = await this.fetchPackageInfo(provider, order.baselinkerOrderId!);
          
          if (!packageInfo) {
            result.skipped++;
            continue;
          }

          // Check if anything changed
          const hasChanges = 
            packageInfo.trackingNumber !== order.trackingNumber ||
            packageInfo.deliveryStatus !== order.deliveryStatus ||
            packageInfo.courierCode !== order.courierCode;

          if (!hasChanges) {
            result.skipped++;
            continue;
          }

          // Build update data
          const updateData: any = {};
          
          if (packageInfo.trackingNumber && packageInfo.trackingNumber !== order.trackingNumber) {
            updateData.trackingNumber = packageInfo.trackingNumber;
          }
          if (packageInfo.trackingLink) {
            updateData.trackingLink = packageInfo.trackingLink;
          }
          if (packageInfo.courierCode) {
            updateData.courierCode = packageInfo.courierCode;
          }
          if (packageInfo.deliveryStatus !== order.deliveryStatus) {
            updateData.deliveryStatus = packageInfo.deliveryStatus;
            updateData.deliveryStatusUpdatedAt = new Date();
          }

          // Check if delivery status implies order status change
          const impliedOrderStatus = packageInfo.deliveryStatus 
            ? DELIVERY_STATUS_TO_ORDER_STATUS[packageInfo.deliveryStatus] 
            : null;

          const shouldUpdateOrderStatus = impliedOrderStatus && 
            impliedOrderStatus !== order.status &&
            this.isStatusProgression(order.status, impliedOrderStatus);

          await prisma.$transaction(async (tx) => {
            // Update order with delivery info
            await tx.order.update({
              where: { id: order.id },
              data: updateData,
            });

            // Update order status if delivery status implies progression
            if (shouldUpdateOrderStatus) {
              await tx.order.update({
                where: { id: order.id },
                data: { status: impliedOrderStatus as any },
              });

              await tx.orderStatusHistory.create({
                data: {
                  orderId: order.id,
                  status: impliedOrderStatus as any,
                  note: `Auto-sync: status dostawy "${this.getStatusLabel(packageInfo.deliveryStatus)}" → ${impliedOrderStatus}`,
                },
              });

              console.log(`[DeliveryTracking] Order ${order.orderNumber}: ${order.status} → ${impliedOrderStatus} (delivery: ${packageInfo.deliveryStatus})`);
            }
          });

          console.log(`[DeliveryTracking] Order ${order.orderNumber}: delivery="${this.getStatusLabel(packageInfo.deliveryStatus)}" tracking=${packageInfo.trackingNumber || '-'}`);
          result.updated++;

        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Order ${order.orderNumber}: ${msg}`);
        }
      }

      console.log(`[DeliveryTracking] Done: updated=${result.updated}, skipped=${result.skipped}, errors=${result.errors.length}`);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(msg);
      console.error('[DeliveryTracking] Fatal error:', error);
    }

    return result;
  }

  /**
   * Fetch package info for a single order from Baselinker
   */
  private async fetchPackageInfo(
    provider: ReturnType<typeof createBaselinkerProvider>,
    baselinkerOrderId: string
  ): Promise<PackageInfo | null> {
    try {
      const packages = await provider.getOrderPackages(baselinkerOrderId);
      
      if (!packages || packages.length === 0) {
        return null;
      }

      // Use the first (primary) package
      const pkg = packages[0];
      
      return {
        courierCode: pkg.courier_code || '',
        trackingNumber: pkg.courier_package_nr || '',
        trackingLink: pkg.tracking_link || this.buildTrackingLink(pkg),
        deliveryStatus: this.extractDeliveryStatus(pkg),
        isSent: pkg.is_sent || !!pkg.courier_package_nr,
      };
    } catch (error) {
      console.error(`[DeliveryTracking] Error fetching packages for BL order ${baselinkerOrderId}:`, error);
      return null;
    }
  }

  /**
   * Extract delivery status from package data.
   * Baselinker's tracking_status field contains a numeric code.
   * We map it to our string-based delivery status.
   */
  private extractDeliveryStatus(pkg: BaselinkerOrderPackage): string | null {
    // If package has a tracking_status from Baselinker
    if (pkg.tracking_status !== undefined && pkg.tracking_status !== null) {
      return this.mapTrackingStatus(pkg.tracking_status, pkg.courier_code);
    }

    // Fallback: if package is marked as sent but no detailed status
    if (pkg.is_sent || pkg.courier_package_nr) {
      return 'shipped';
    }

    return null;
  }

  /**
   * Map Baselinker tracking_status numeric code to our string status.
   * These codes come from Baselinker's getOrderPackages API.
   */
  private mapTrackingStatus(statusCode: number, courierCode?: string): string {
    // Baselinker tracking status codes:
    // -1 = unknown, 0 = not sent, 1 = in transit, 2 = delivered, 3 = returned, 4 = other
    switch (statusCode) {
      case -1: return 'unknown';
      case 0: return 'created';
      case 1: return 'in_transit';
      case 2: return 'delivered';
      case 3: return 'returned_to_sender';
      case 4: return 'other';
      default: return 'unknown';
    }
  }

  /**
   * Build a tracking link if Baselinker doesn't provide one
   */
  private buildTrackingLink(pkg: BaselinkerOrderPackage): string | null {
    if (!pkg.courier_package_nr) return null;

    const code = (pkg.courier_code || '').toLowerCase();
    const trackingNr = encodeURIComponent(pkg.courier_package_nr);

    if (code.includes('inpost')) {
      return `https://inpost.pl/sledzenie-przesylek?number=${trackingNr}`;
    }
    if (code.includes('dpd')) {
      return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${trackingNr}`;
    }
    if (code.includes('dhl')) {
      return `https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=${trackingNr}`;
    }
    if (code.includes('ups')) {
      return `https://www.ups.com/track?tracknum=${trackingNr}`;
    }
    if (code.includes('gls')) {
      return `https://gls-group.com/PL/pl/sledzenie-paczek?match=${trackingNr}`;
    }
    if (code.includes('poczta') || code.includes('pocztex')) {
      return `https://emonitoring.poczta-polska.pl/?numer=${trackingNr}`;
    }
    if (code.includes('fedex')) {
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNr}`;
    }

    return null;
  }

  /**
   * Check if transitioning from oldStatus to newStatus is a valid progression
   * (prevent going backwards, e.g., DELIVERED → SHIPPED)
   */
  private isStatusProgression(oldStatus: string, newStatus: string): boolean {
    const ORDER = ['PENDING', 'OPEN', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const oldIdx = ORDER.indexOf(oldStatus);
    const newIdx = ORDER.indexOf(newStatus);
    
    // Allow progression forward, or handle cancellation
    if (newStatus === 'CANCELLED' || newStatus === 'REFUNDED') return true;
    if (oldIdx === -1 || newIdx === -1) return false;
    return newIdx > oldIdx;
  }

  /**
   * Get human-readable label for a delivery status
   */
  getStatusLabel(status: string | null): string {
    if (!status) return 'Brak informacji';
    return DELIVERY_STATUS_LABELS[status] || status;
  }

  /**
   * Sync delivery status for a single order (for manual trigger)
   */
  async syncSingleOrder(orderId: string): Promise<{
    success: boolean;
    deliveryStatus?: string;
    trackingNumber?: string;
    error?: string;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          baselinkerOrderId: true,
          status: true,
          trackingNumber: true,
          deliveryStatus: true,
          courierCode: true,
        },
      });

      if (!order) return { success: false, error: 'Order not found' };
      if (!order.baselinkerOrderId) return { success: false, error: 'Order not synced to Baselinker' };

      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) return { success: false, error: 'Baselinker not configured' };

      const apiToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      const provider = createBaselinkerProvider({
        apiToken,
        inventoryId: config.inventoryId,
      });

      const packageInfo = await this.fetchPackageInfo(provider, order.baselinkerOrderId);

      if (!packageInfo) {
        return { success: true, deliveryStatus: 'no_packages', trackingNumber: undefined };
      }

      // Update order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          trackingNumber: packageInfo.trackingNumber || order.trackingNumber,
          trackingLink: packageInfo.trackingLink,
          courierCode: packageInfo.courierCode || order.courierCode,
          deliveryStatus: packageInfo.deliveryStatus,
          deliveryStatusUpdatedAt: new Date(),
        },
      });

      return {
        success: true,
        deliveryStatus: packageInfo.deliveryStatus || undefined,
        trackingNumber: packageInfo.trackingNumber || undefined,
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }
}

// Singleton
export const deliveryTrackingService = new DeliveryTrackingService();
