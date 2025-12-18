/**
 * Shipping Provider Interface
 * Base interface that all shipping provider implementations must follow
 */

import {
  ShippingProviderConfig,
  ShippingProviderId,
  PickupPoint,
  ShippingRate,
  ShippingRateRequest,
  CreateShipmentRequest,
  Shipment,
  TrackingInfo,
} from '../../types/shipping.types';

export interface IShippingProvider {
  readonly providerId: ShippingProviderId;
  readonly config: ShippingProviderConfig;

  /**
   * Calculate shipping rates for given parameters
   */
  calculateRates(request: ShippingRateRequest): Promise<ShippingRate[]>;

  /**
   * Create a shipment and generate label
   */
  createShipment(request: CreateShipmentRequest): Promise<Shipment>;

  /**
   * Get tracking information for a shipment
   */
  getTracking(trackingNumber: string): Promise<TrackingInfo>;

  /**
   * Cancel a shipment (if supported)
   */
  cancelShipment(shipmentId: string): Promise<boolean>;

  /**
   * Get pickup points near a location (for Paczkomaty, etc.)
   */
  getPickupPoints?(
    postalCode: string,
    city?: string,
    limit?: number
  ): Promise<PickupPoint[]>;

  /**
   * Get label for an existing shipment
   */
  getLabel(shipmentId: string, format?: 'PDF' | 'ZPL' | 'PNG'): Promise<Buffer>;

  /**
   * Validate webhook signature
   */
  validateWebhook(payload: string, signature: string): boolean;
}
