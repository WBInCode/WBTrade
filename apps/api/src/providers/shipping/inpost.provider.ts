/**
 * InPost Shipping Provider
 * Integration with InPost API for Paczkomaty and Courier services
 * 
 * API Documentation: https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/overview
 */

import crypto from 'crypto';
import { IShippingProvider } from './shipping-provider.interface';
import {
  ShippingProviderConfig,
  ShippingProviderId,
  PickupPoint,
  ShippingRate,
  ShippingRateRequest,
  CreateShipmentRequest,
  Shipment,
  TrackingInfo,
  ShipmentStatus,
} from '../../types/shipping.types';

export class InPostProvider implements IShippingProvider {
  readonly providerId: ShippingProviderId = 'inpost_paczkomat';
  readonly config: ShippingProviderConfig;
  
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: Partial<ShippingProviderConfig>) {
    this.config = {
      id: 'inpost_paczkomat',
      name: 'InPost',
      enabled: true,
      apiUrl: config.sandbox 
        ? 'https://sandbox-api-shipx-pl.easypack24.net/v1'
        : 'https://api-shipx-pl.easypack24.net/v1',
      apiKey: config.apiKey || process.env.INPOST_API_KEY || '',
      sandbox: config.sandbox ?? process.env.NODE_ENV !== 'production',
      webhookSecret: config.webhookSecret || process.env.INPOST_WEBHOOK_SECRET,
    };
    this.baseUrl = this.config.apiUrl;
  }

  /**
   * Get authentication token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // InPost uses direct API key authentication
    // For OAuth flow, implement token refresh here
    this.accessToken = this.config.apiKey || '';
    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`InPost API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Calculate shipping rates
   */
  async calculateRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = [];

    // InPost Paczkomat rate
    if (request.pickupPointCode) {
      rates.push({
        providerId: 'inpost_paczkomat',
        serviceType: 'inpost_locker_standard',
        serviceName: 'InPost Paczkomat',
        price: 9.99,
        currency: 'PLN',
        estimatedDeliveryDays: { min: 1, max: 2 },
        pickupPointRequired: true,
      });
    }

    // InPost Courier rate
    rates.push({
      providerId: 'inpost_kurier',
      serviceType: 'inpost_courier_standard',
      serviceName: 'Kurier InPost',
      price: 14.99,
      currency: 'PLN',
      estimatedDeliveryDays: { min: 1, max: 2 },
      pickupPointRequired: false,
    });

    // InPost Courier Express
    rates.push({
      providerId: 'inpost_kurier',
      serviceType: 'inpost_courier_express',
      serviceName: 'Kurier InPost Express',
      price: 24.99,
      currency: 'PLN',
      estimatedDeliveryDays: { min: 0, max: 1 },
      pickupPointRequired: false,
    });

    return rates;
  }

  /**
   * Create shipment in InPost system
   */
  async createShipment(request: CreateShipmentRequest): Promise<Shipment> {
    const isPaczkomat = !!request.pickupPoint?.code;
    
    const shipmentData = {
      receiver: {
        name: request.recipient.name,
        company_name: request.recipient.company,
        email: request.recipient.email,
        phone: request.recipient.phone,
        address: isPaczkomat ? undefined : {
          street: request.recipient.address.street,
          building_number: this.extractBuildingNumber(request.recipient.address.street),
          city: request.recipient.address.city,
          post_code: request.recipient.address.postalCode,
          country_code: request.recipient.address.country,
        },
      },
      sender: {
        name: request.sender.name,
        company_name: request.sender.company,
        email: request.sender.email,
        phone: request.sender.phone,
        address: {
          street: request.sender.address.street,
          building_number: this.extractBuildingNumber(request.sender.address.street),
          city: request.sender.address.city,
          post_code: request.sender.address.postalCode,
          country_code: request.sender.address.country,
        },
      },
      parcels: request.packages.map((pkg, index) => ({
        dimensions: pkg.dimensions ? {
          length: pkg.dimensions.length,
          width: pkg.dimensions.width,
          height: pkg.dimensions.height,
          unit: 'mm',
        } : undefined,
        weight: {
          amount: pkg.weight,
          unit: 'kg',
        },
        is_non_standard: false,
      })),
      service: isPaczkomat ? 'inpost_locker_standard' : 'inpost_courier_standard',
      custom_attributes: {
        target_point: isPaczkomat ? request.pickupPoint?.code : undefined,
        sending_method: 'dispatch_order',
      },
      reference: request.reference || request.orderId,
      cod: request.cod ? {
        amount: request.cod.amount,
        currency: request.cod.currency,
      } : undefined,
      insurance: request.insurance ? {
        amount: request.insurance.amount,
        currency: request.insurance.currency,
      } : undefined,
    };

    // Create shipment via API
    // In sandbox mode, return mock response
    if (this.config.sandbox) {
      return this.createMockShipment(request);
    }

    const response = await this.request<any>('POST', '/shipments', shipmentData);

    return {
      id: response.id,
      orderId: request.orderId,
      providerId: isPaczkomat ? 'inpost_paczkomat' : 'inpost_kurier',
      trackingNumber: response.tracking_number,
      trackingUrl: `https://inpost.pl/sledzenie-przesylek?number=${response.tracking_number}`,
      status: this.mapStatus(response.status),
      labelUrl: response.label_url,
      labelFormat: 'PDF',
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
    };
  }

  /**
   * Get tracking information
   */
  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    if (this.config.sandbox) {
      return this.getMockTracking(trackingNumber);
    }

    const response = await this.request<any>('GET', `/tracking/${trackingNumber}`);

    return {
      trackingNumber,
      providerId: this.providerId,
      status: this.mapStatus(response.status),
      estimatedDelivery: response.expected_delivery_date 
        ? new Date(response.expected_delivery_date) 
        : undefined,
      events: response.tracking_details.map((event: any) => ({
        timestamp: new Date(event.datetime),
        status: this.mapStatus(event.status),
        description: event.status_description,
        location: event.agency,
      })),
    };
  }

  /**
   * Get pickup points (Paczkomaty) near location
   */
  async getPickupPoints(
    postalCode: string,
    city?: string,
    limit = 10
  ): Promise<PickupPoint[]> {
    if (this.config.sandbox) {
      return this.getMockPickupPoints(postalCode);
    }

    const params = new URLSearchParams({
      post_code: postalCode,
      type: 'parcel_locker',
      per_page: limit.toString(),
    });

    if (city) {
      params.append('city', city);
    }

    const response = await this.request<any>('GET', `/points?${params}`);

    return response.items.map((point: any) => ({
      id: point.id,
      code: point.name,
      name: point.name,
      type: 'paczkomat' as const,
      address: {
        street: point.address.line1,
        city: point.address.city,
        postalCode: point.address.post_code,
        country: 'PL',
      },
      location: {
        latitude: point.location.latitude,
        longitude: point.location.longitude,
      },
      openingHours: point.operating_hours,
      paymentAvailable: point.payment_available,
      functions: point.functions,
    }));
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId: string): Promise<boolean> {
    if (this.config.sandbox) {
      return true;
    }

    try {
      await this.request('DELETE', `/shipments/${shipmentId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel InPost shipment:', error);
      return false;
    }
  }

  /**
   * Get shipping label
   */
  async getLabel(shipmentId: string, format: 'PDF' | 'ZPL' | 'PNG' = 'PDF'): Promise<Buffer> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${this.baseUrl}/shipments/${shipmentId}/label?format=${format}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get label');
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Validate webhook signature
   */
  validateWebhook(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Helper methods
  private extractBuildingNumber(street: string): string {
    const match = street.match(/\d+[a-zA-Z]?$/);
    return match ? match[0] : '1';
  }

  private mapStatus(inpostStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'created': 'created',
      'offers_prepared': 'created',
      'offer_selected': 'created',
      'confirmed': 'label_generated',
      'dispatched_by_sender': 'picked_up',
      'collected_from_sender': 'picked_up',
      'taken_by_courier': 'in_transit',
      'adopted_at_source_branch': 'in_transit',
      'sent_from_source_branch': 'in_transit',
      'adopted_at_sorting_center': 'in_transit',
      'sent_from_sorting_center': 'in_transit',
      'adopted_at_target_branch': 'in_transit',
      'out_for_delivery': 'out_for_delivery',
      'ready_to_pickup': 'out_for_delivery',
      'delivered': 'delivered',
      'pickup_reminder_sent': 'out_for_delivery',
      'returned_to_sender': 'returned',
      'avizo': 'exception',
      'claimed': 'exception',
      'cancelled': 'cancelled',
    };

    return statusMap[inpostStatus] || 'in_transit';
  }

  // Mock methods for sandbox/testing
  private createMockShipment(request: CreateShipmentRequest): Shipment {
    const trackingNumber = `INPOST${Date.now()}`;
    return {
      id: `mock_${Date.now()}`,
      orderId: request.orderId,
      providerId: request.pickupPoint ? 'inpost_paczkomat' : 'inpost_kurier',
      trackingNumber,
      trackingUrl: `https://inpost.pl/sledzenie-przesylek?number=${trackingNumber}`,
      status: 'created',
      labelUrl: `https://sandbox.inpost.pl/labels/${trackingNumber}.pdf`,
      labelFormat: 'PDF',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getMockTracking(trackingNumber: string): TrackingInfo {
    return {
      trackingNumber,
      providerId: this.providerId,
      status: 'in_transit',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      events: [
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'in_transit',
          description: 'Przesyłka w drodze do sortowni',
          location: 'Warszawa',
        },
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'picked_up',
          description: 'Przesyłka odebrana od nadawcy',
          location: 'Warszawa',
        },
        {
          timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
          status: 'created',
          description: 'Przesyłka zarejestrowana',
          location: 'Warszawa',
        },
      ],
    };
  }

  private getMockPickupPoints(postalCode: string): PickupPoint[] {
    return [
      {
        id: '1',
        code: `WAW${postalCode.replace('-', '')}M`,
        name: `Paczkomat WAW${postalCode.replace('-', '')}M`,
        type: 'paczkomat',
        address: {
          street: 'ul. Przykładowa 1',
          city: 'Warszawa',
          postalCode,
          country: 'PL',
        },
        location: { latitude: 52.2297, longitude: 21.0122 },
        paymentAvailable: true,
      },
      {
        id: '2',
        code: `WAW${postalCode.replace('-', '')}A`,
        name: `Paczkomat WAW${postalCode.replace('-', '')}A`,
        type: 'paczkomat',
        address: {
          street: 'ul. Testowa 5',
          city: 'Warszawa',
          postalCode,
          country: 'PL',
        },
        location: { latitude: 52.2300, longitude: 21.0150 },
        paymentAvailable: false,
      },
    ];
  }
}
