/**
 * Shipping Service
 * Manages shipping provider integrations and shipping operations
 */

import {
  ShippingProviderId,
  ShippingRate,
  ShippingRateRequest,
  CreateShipmentRequest,
  Shipment,
  TrackingInfo,
  PickupPoint,
  ShippingProviderConfig,
} from '../types/shipping.types';
import { IShippingProvider } from '../providers/shipping/shipping-provider.interface';
import { InPostProvider } from '../providers/shipping/inpost.provider';
import { prisma } from '../db';

// Provider configurations from environment
const providerConfigs: Record<ShippingProviderId, Partial<ShippingProviderConfig>> = {
  inpost_paczkomat: {
    apiKey: process.env.INPOST_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  inpost_kurier: {
    apiKey: process.env.INPOST_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  dpd: {
    apiKey: process.env.DPD_API_KEY,
    apiSecret: process.env.DPD_API_SECRET,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  dhl: {
    apiKey: process.env.DHL_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  gls: {
    apiKey: process.env.GLS_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  pocztex: {
    apiKey: process.env.POCZTEX_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  fedex: {
    apiKey: process.env.FEDEX_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  ups: {
    apiKey: process.env.UPS_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
};

export class ShippingService {
  private providers: Map<ShippingProviderId, IShippingProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize available shipping providers
   */
  private initializeProviders() {
    // Initialize InPost provider
    const inpostConfig = providerConfigs.inpost_paczkomat;
    if (inpostConfig.apiKey || process.env.NODE_ENV !== 'production') {
      const inpostProvider = new InPostProvider(inpostConfig);
      this.providers.set('inpost_paczkomat', inpostProvider);
      this.providers.set('inpost_kurier', inpostProvider);
    }

    // TODO: Initialize other providers (DPD, DHL, GLS, etc.)
    // Example:
    // if (providerConfigs.dpd.apiKey) {
    //   this.providers.set('dpd', new DPDProvider(providerConfigs.dpd));
    // }
  }

  /**
   * Get provider instance
   */
  private getProvider(providerId: ShippingProviderId): IShippingProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Shipping provider ${providerId} is not available`);
    }
    return provider;
  }

  /**
   * Get all available shipping methods with rates
   */
  async getAvailableShippingMethods(request: ShippingRateRequest): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = [];
    const errors: string[] = [];

    // Get rates from all available providers
    for (const [providerId, provider] of this.providers) {
      try {
        const providerRates = await provider.calculateRates(request);
        rates.push(...providerRates);
      } catch (error) {
        console.error(`Error getting rates from ${providerId}:`, error);
        errors.push(providerId);
      }
    }

    // Sort by price
    rates.sort((a, b) => a.price - b.price);

    return rates;
  }

  /**
   * Calculate shipping rate for specific provider
   */
  async calculateRate(
    providerId: ShippingProviderId,
    request: ShippingRateRequest
  ): Promise<ShippingRate[]> {
    const provider = this.getProvider(providerId);
    return provider.calculateRates(request);
  }

  /**
   * Create shipment
   */
  async createShipment(request: CreateShipmentRequest): Promise<Shipment> {
    const provider = this.getProvider(request.providerId);
    const shipment = await provider.createShipment(request);

    // Store shipment in database
    await prisma.order.update({
      where: { id: request.orderId },
      data: {
        trackingNumber: shipment.trackingNumber,
        // Store additional shipping data in metadata or separate table
      },
    });

    return shipment;
  }

  /**
   * Get tracking information
   */
  async getTracking(
    providerId: ShippingProviderId,
    trackingNumber: string
  ): Promise<TrackingInfo> {
    const provider = this.getProvider(providerId);
    return provider.getTracking(trackingNumber);
  }

  /**
   * Get pickup points near location
   */
  async getPickupPoints(
    providerId: ShippingProviderId,
    postalCode: string,
    city?: string,
    limit?: number
  ): Promise<PickupPoint[]> {
    const provider = this.getProvider(providerId);
    if (provider.getPickupPoints) {
      return provider.getPickupPoints(postalCode, city, limit);
    }
    return [];
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(
    providerId: ShippingProviderId,
    shipmentId: string
  ): Promise<boolean> {
    const provider = this.getProvider(providerId);
    return provider.cancelShipment(shipmentId);
  }

  /**
   * Get shipping label
   */
  async getLabel(
    providerId: ShippingProviderId,
    shipmentId: string,
    format?: 'PDF' | 'ZPL' | 'PNG'
  ): Promise<Buffer> {
    const provider = this.getProvider(providerId);
    return provider.getLabel(shipmentId, format);
  }

  /**
   * Process webhook from shipping provider
   */
  async processWebhook(
    providerId: ShippingProviderId,
    payload: string,
    signature: string
  ): Promise<void> {
    const provider = this.getProvider(providerId);
    
    // Validate signature
    if (!provider.validateWebhook(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const data = JSON.parse(payload);
    
    // Update order status based on shipment status
    // This would need to be customized based on your order status flow
    const { trackingNumber, status } = data;

    // Find order by tracking number and update status
    const order = await prisma.order.findFirst({
      where: { trackingNumber },
    });

    if (order) {
      const orderStatusMap: Record<string, string> = {
        'delivered': 'DELIVERED',
        'in_transit': 'SHIPPED',
        'out_for_delivery': 'SHIPPED',
        'returned': 'RETURNED',
        'exception': 'PROCESSING',
      };

      const newStatus = orderStatusMap[status];
      if (newStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: newStatus as any },
        });

        // Add to status history
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: newStatus as any,
            note: `Status updated from ${providerId}: ${status}`,
          },
        });
      }
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): ShippingProviderId[] {
    return Array.from(this.providers.keys());
  }
}

// Export singleton instance
export const shippingService = new ShippingService();
