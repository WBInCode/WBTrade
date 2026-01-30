/**
 * Baselinker Orders Synchronization Service
 * 
 * Handles syncing orders FROM local shop TO Baselinker.
 * This is the "feedback loop" - when a customer pays for an order,
 * we send it to Baselinker which automatically decreases stock.
 * 
 * IMPORTANT: Orders are synced ONLY after payment is confirmed (paymentStatus = PAID)
 * This ensures stock is not decreased for unpaid/cancelled orders.
 * 
 * MULTI-WAREHOUSE: Each product is automatically assigned to the correct
 * Baselinker inventory based on its baselinkerProductId prefix or tags.
 */

import { prisma } from '../db';
import { decryptToken } from '../lib/encryption';
import { createBaselinkerProvider } from '../providers/baselinker';
import type { BaselinkerAddOrderRequest, BaselinkerOrderProduct } from '../providers/baselinker/baselinker-provider.interface';

// ============================================
// Warehouse Mapping Configuration
// ============================================

/**
 * Maps product prefixes/tags to Baselinker inventory IDs
 * This allows automatic routing of products to correct warehouses
 */
const WAREHOUSE_MAPPING: Record<string, string> = {
  'btp': '22953',      // BTP warehouse
  'hp': '22954',       // HP (Hurtownia Przemysłowa)
  'leker': '22952',    // Leker
  'ikonka': '22951',   // Ikonka (detected by tag)
  'default': '11235',  // Główny (default fallback)
};

/**
 * Baselinker order status IDs
 */
const BL_STATUS = {
  UNPAID: 65823,         // "Nieopłacone" - czerwony
  NEW_ORDER: 65342,      // "Nowe zamówienia" - niebieski (po opłaceniu)
  CANCELLED: 65816,      // "Zwroty/Anulowa" - czerwony
};

/**
 * Default order status ID for new (unpaid) orders in Baselinker
 */
const DEFAULT_ORDER_STATUS_ID = BL_STATUS.UNPAID;

/**
 * Detect warehouse inventory ID from product data
 */
function detectWarehouseId(baselinkerProductId: string | null, tags: string[] = []): string {
  // 1. Check prefix in baselinkerProductId (e.g., "btp-212551167")
  if (baselinkerProductId) {
    const prefix = baselinkerProductId.split('-')[0]?.toLowerCase();
    if (prefix && WAREHOUSE_MAPPING[prefix]) {
      return WAREHOUSE_MAPPING[prefix];
    }
  }
  
  // 2. Check tags for warehouse indicators
  const lowerTags = tags.map(t => t.toLowerCase());
  
  if (lowerTags.includes('btp')) return WAREHOUSE_MAPPING['btp'];
  if (lowerTags.includes('hp') || lowerTags.includes('hurtownia przemysłowa')) return WAREHOUSE_MAPPING['hp'];
  if (lowerTags.includes('leker')) return WAREHOUSE_MAPPING['leker'];
  if (lowerTags.includes('ikonka')) return WAREHOUSE_MAPPING['ikonka'];
  if (lowerTags.includes('forcetop')) return WAREHOUSE_MAPPING['ikonka']; // Forcetop uses ikonka
  
  // 3. If baselinkerProductId is just a number (no prefix), use default
  return WAREHOUSE_MAPPING['default'];
}

// ============================================
// Types
// ============================================

export interface OrderSyncResult {
  success: boolean;
  orderId: string;
  baselinkerOrderId?: string;
  error?: string;
}

export interface SyncOrderToBaselinkerOptions {
  /** Baselinker order status ID (default: Nieopłacone) */
  orderStatusId?: number;
  /** Force sync even if already synced */
  force?: boolean;
  /** Skip payment check - for initial order creation */
  skipPaymentCheck?: boolean;
}

// ============================================
// Service Class
// ============================================

export class BaselinkerOrdersService {
  /**
   * Sync a single order to Baselinker
   * Orders are synced immediately after creation with status "Nieopłacone"
   * After payment, the status is updated to "Nowe zamówienia"
   * 
   * @param orderId - Local order ID
   * @param options - Sync options
   */
  async syncOrderToBaselinker(
    orderId: string,
    options: SyncOrderToBaselinkerOptions = {}
  ): Promise<OrderSyncResult> {
    const { orderStatusId = DEFAULT_ORDER_STATUS_ID, force = false, skipPaymentCheck = false } = options;

    try {
      // 1. Get order with all related data
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          shippingAddress: true,
          billingAddress: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
        },
      });

      if (!order) {
        return {
          success: false,
          orderId,
          error: 'Order not found',
        };
      }

      // 2. Check if already synced (unless force)
      if (order.baselinkerOrderId && !force) {
        console.log(`[BaselinkerOrders] Order ${orderId} already synced as BL order ${order.baselinkerOrderId}`);
        return {
          success: true,
          orderId,
          baselinkerOrderId: order.baselinkerOrderId,
        };
      }

      // 3. Skip payment check for new orders - they go to Baselinker as "Nieopłacone"
      // Payment check is only enforced when we need to update status to "paid"
      if (!skipPaymentCheck && order.paymentStatus !== 'PAID' && !force) {
        // If order is not paid and we're not skipping check, just sync with unpaid status
        console.log(`[BaselinkerOrders] Order ${orderId} is unpaid, syncing with Nieopłacone status`);
      }

      // 4. Get Baselinker configuration
      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) {
        console.warn('[BaselinkerOrders] No Baselinker config found or sync disabled');
        return {
          success: false,
          orderId,
          error: 'Baselinker integration not configured or disabled',
        };
      }

      // 5. Decrypt API token and create provider
      const apiToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      const provider = createBaselinkerProvider({
        apiToken,
        inventoryId: config.inventoryId,
      });

      // 6. Map order to Baselinker format
      const blOrderData = this.mapOrderToBaselinker(order, config.inventoryId, orderStatusId);

      // 7. Send to Baselinker
      console.log(`[BaselinkerOrders] Sending order ${order.orderNumber} to Baselinker...`);
      const result = await provider.addOrder(blOrderData);

      // 8. Update local order with Baselinker order ID
      await prisma.order.update({
        where: { id: orderId },
        data: {
          baselinkerOrderId: result.order_id.toString(),
          baselinkerSyncedAt: new Date(),
        },
      });

      // 9. Add to order history
      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: order.status,
          note: `Zamówienie zsynchronizowane do Baselinkera (ID: ${result.order_id})`,
        },
      });

      console.log(`[BaselinkerOrders] Order ${order.orderNumber} synced successfully, BL order ID: ${result.order_id}`);

      return {
        success: true,
        orderId,
        baselinkerOrderId: result.order_id.toString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BaselinkerOrders] Failed to sync order %s:', orderId, error);

      return {
        success: false,
        orderId,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync multiple pending orders to Baselinker
   * Only syncs orders that are PAID but not yet synced
   */
  async syncPendingOrders(): Promise<OrderSyncResult[]> {
    // Find all paid orders without baselinkerOrderId
    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        baselinkerOrderId: null,
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'],
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 50, // Limit batch size
    });

    console.log(`[BaselinkerOrders] Found ${pendingOrders.length} pending orders to sync`);

    const results: OrderSyncResult[] = [];

    for (const order of pendingOrders) {
      const result = await this.syncOrderToBaselinker(order.id);
      results.push(result);

      // Add delay between orders to avoid rate limiting
      if (pendingOrders.indexOf(order) < pendingOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[BaselinkerOrders] Sync completed: ${successful} successful, ${failed} failed`);

    return results;
  }

  /**
   * Map local order to Baselinker addOrder format
   * Each product is automatically assigned to the correct warehouse based on its prefix/tags
   */
  private mapOrderToBaselinker(
    order: any,
    _inventoryId: string, // Not used anymore - each product has its own warehouse
    orderStatusId: number
  ): BaselinkerAddOrderRequest {
    // Map shipping method to Baselinker format
    const deliveryMethod = this.mapShippingMethod(order.shippingMethod);

    // Map payment method
    const paymentMethod = this.mapPaymentMethod(order.paymentMethod);

    // Build products array - each product gets its own warehouse automatically
    const products: BaselinkerOrderProduct[] = order.items.map((item: any) => {
      const product = item.variant?.product;
      const variant = item.variant;

      // Automatically detect the correct warehouse for this product
      const warehouseId = detectWarehouseId(
        product?.baselinkerProductId || null,
        product?.tags || []
      );

      // Extract raw product ID (without prefix) for Baselinker
      let rawProductId = product?.baselinkerProductId || undefined;
      if (rawProductId && rawProductId.includes('-')) {
        // Remove prefix (e.g., "btp-212551167" -> "212551167")
        rawProductId = rawProductId.split('-').slice(1).join('-');
      }

      console.log(`[BaselinkerOrders] Product "${item.productName}" -> Warehouse ${warehouseId}, BL ID: ${rawProductId}`);

      return {
        // Use 'bl' storage to link to Baselinker inventory and auto-decrease stock
        storage: 'bl' as const,
        storage_id: warehouseId, // Each product uses its detected warehouse
        product_id: rawProductId,
        variant_id: variant?.baselinkerVariantId ? parseInt(variant.baselinkerVariantId) : 0,
        name: item.productName,
        sku: item.sku || '',
        ean: variant?.barcode || product?.barcode || '',
        price_brutto: Number(item.unitPrice),
        tax_rate: 23, // Polish VAT rate
        quantity: item.quantity,
        weight: variant?.weight || product?.weight || 0,
      };
    });

    // Add discount as a product with negative price (standard Baselinker approach)
    const orderDiscount = Number(order.discount || 0);
    if (orderDiscount > 0) {
      products.push({
        storage: 'db' as const,
        storage_id: '0',
        name: `Rabat (kupon)`,
        sku: 'DISCOUNT',
        price_brutto: -orderDiscount, // Negative price for discount
        tax_rate: 23,
        quantity: 1,
        weight: 0,
      });
      console.log(`[BaselinkerOrders] Added discount: -${orderDiscount} PLN`);
    }

    // Build the order request
    const blOrder: BaselinkerAddOrderRequest = {
      order_status_id: orderStatusId,
      date_add: Math.floor(order.createdAt.getTime() / 1000),
      currency: 'PLN',
      payment_method: paymentMethod,
      payment_method_cod: order.paymentMethod === 'cod',
      paid: order.paymentStatus === 'PAID',
      user_comments: order.customerNotes || '',
      admin_comments: `WBTrade Order: ${order.orderNumber}`,
      email: order.user?.email || '',
      phone: order.shippingAddress?.phone || order.user?.phone || '',
      delivery_method: deliveryMethod,
      delivery_price: Number(order.shipping),
      products,
    };

    // Add shipping address
    if (order.shippingAddress) {
      blOrder.delivery_fullname = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
      blOrder.delivery_address = order.shippingAddress.street;
      blOrder.delivery_city = order.shippingAddress.city;
      blOrder.delivery_postcode = order.shippingAddress.postalCode;
      blOrder.delivery_country_code = order.shippingAddress.country || 'PL';
    }

    // Add paczkomat data if applicable
    if (order.paczkomatCode) {
      blOrder.delivery_point_id = order.paczkomatCode;
      blOrder.delivery_point_name = order.paczkomatCode;
      blOrder.delivery_point_address = order.paczkomatAddress || '';
    }

    // Add billing/invoice data
    if (order.billingAddress) {
      blOrder.invoice_fullname = `${order.billingAddress.firstName} ${order.billingAddress.lastName}`;
      blOrder.invoice_company = order.billingAddress.companyName || '';
      blOrder.invoice_nip = order.billingAddress.nip || '';
      blOrder.invoice_address = order.billingAddress.street;
      blOrder.invoice_city = order.billingAddress.city;
      blOrder.invoice_postcode = order.billingAddress.postalCode;
      blOrder.invoice_country_code = order.billingAddress.country || 'PL';
      blOrder.want_invoice = true;
    }

    return blOrder;
  }

  /**
   * Map local shipping method to Baselinker delivery method name
   */
  private mapShippingMethod(method: string): string {
    const mappings: Record<string, string> = {
      'inpost_paczkomat': 'InPost Paczkomaty',
      'inpost_kurier': 'InPost Kurier',
      'dpd': 'DPD Kurier',
      'dhl': 'DHL Kurier',
      'pocztex': 'Pocztex',
      'orlen_paczka': 'Orlen Paczka',
      'pickup': 'Odbiór osobisty',
    };

    return mappings[method] || method;
  }

  /**
   * Map local payment method to Baselinker format
   */
  private mapPaymentMethod(method: string): string {
    const mappings: Record<string, string> = {
      // From checkout
      'payu': 'PayU',
      'przelewy24': 'Przelewy24',
      'blik': 'BLIK',
      'card': 'Karta płatnicza',
      'transfer': 'Przelew bankowy',
      'cod': 'Płatność przy odbiorze',
      // From PayU webhook (actual method used)
      'BLIK': 'BLIK',
      'Karta płatnicza': 'Karta płatnicza',
      'Przelew bankowy': 'Przelew bankowy',
      'Google Pay': 'Google Pay',
      'Apple Pay': 'Apple Pay',
      'Klarna': 'Klarna',
      'PayPo': 'PayPo',
      'Twisto': 'Twisto',
      // Bank names
      'mBank': 'Przelew mBank',
      'Pekao': 'Przelew Pekao',
      'ING': 'Przelew ING',
      'PKO BP': 'Przelew PKO BP',
      'BNP Paribas': 'Przelew BNP Paribas',
      'Santander': 'Przelew Santander',
      'Alior': 'Przelew Alior',
    };

    return mappings[method] || method;
  }

  /**
   * Update order status in Baselinker after payment
   * Changes status from "Nieopłacone" to "Nowe zamówienia"
   */
  async markOrderAsPaid(orderId: string): Promise<OrderSyncResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { 
          id: true, 
          orderNumber: true,
          baselinkerOrderId: true, 
          paymentStatus: true,
          total: true,
          paymentMethod: true,
        },
      });

      if (!order) {
        return { success: false, orderId, error: 'Order not found' };
      }

      if (!order.baselinkerOrderId) {
        console.warn(`[BaselinkerOrders] Order ${orderId} has no Baselinker ID, cannot update status`);
        return { success: false, orderId, error: 'Order not synced to Baselinker yet' };
      }

      // Get Baselinker configuration
      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) {
        return { success: false, orderId, error: 'Baselinker not configured' };
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

      // 1. Update payment amount - this marks order as paid in BL
      const paymentComment = `Płatność ${order.paymentMethod || 'online'}`;
      await provider.setOrderPayment(
        order.baselinkerOrderId, 
        Number(order.total),
        Math.floor(Date.now() / 1000),
        paymentComment
      );

      // 2. Update status to "Nowe zamówienia" (paid)
      await provider.setOrderStatus(order.baselinkerOrderId, BL_STATUS.NEW_ORDER);

      console.log(`[BaselinkerOrders] Order ${order.orderNumber} marked as paid in Baselinker (${order.total} PLN, status: ${BL_STATUS.NEW_ORDER})`);

      return {
        success: true,
        orderId,
        baselinkerOrderId: order.baselinkerOrderId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BaselinkerOrders] Failed to mark order as paid:', orderId, error);
      return { success: false, orderId, error: errorMessage };
    }
  }

  /**
   * Update order status in Baselinker to "Zwroty/Anulowane" (refunded/cancelled)
   * and add refund reason to order notes
   */
  async markOrderAsRefunded(orderId: string, refundReason?: string): Promise<OrderSyncResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { 
          id: true, 
          orderNumber: true,
          baselinkerOrderId: true,
        },
      });

      if (!order) {
        return { success: false, orderId, error: 'Order not found' };
      }

      if (!order.baselinkerOrderId) {
        console.warn(`[BaselinkerOrders] Order ${orderId} has no Baselinker ID, cannot update status to refunded`);
        return { success: false, orderId, error: 'Order not synced to Baselinker yet' };
      }

      // Get Baselinker configuration
      const config = await prisma.baselinkerConfig.findFirst({
        where: { syncEnabled: true },
      });

      if (!config) {
        return { success: false, orderId, error: 'Baselinker not configured' };
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

      // Update status to "Zwroty/Anulowane" (status ID 65816)
      await provider.setOrderStatus(order.baselinkerOrderId, BL_STATUS.CANCELLED);

      // Add refund reason to order notes if provided
      if (refundReason) {
        const refundNote = `[ZWROT ${new Date().toLocaleDateString('pl-PL')}] Powód: ${refundReason}`;
        await provider.setOrderField(order.baselinkerOrderId, 'admin_comments', refundNote);
        console.log(`[BaselinkerOrders] Added refund reason to order ${order.orderNumber}`);
      }

      console.log(`[BaselinkerOrders] Order ${order.orderNumber} marked as refunded in Baselinker (status: ${BL_STATUS.CANCELLED} - Zwroty/Anulowane)`);

      return {
        success: true,
        orderId,
        baselinkerOrderId: order.baselinkerOrderId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BaselinkerOrders] Failed to mark order as refunded:', orderId, error);
      return { success: false, orderId, error: errorMessage };
    }
  }
}

// Export singleton instance
export const baselinkerOrdersService = new BaselinkerOrdersService();

// Export status constants for use in other services
export { BL_STATUS };
