/**
 * Shipping Provider Types
 * Types and interfaces for shipping provider integrations
 */

// Supported shipping providers
export type ShippingProviderId = 
  | 'inpost_paczkomat'
  | 'inpost_kurier'
  | 'dpd'
  | 'dhl'
  | 'gls'
  | 'pocztex'
  | 'fedex'
  | 'ups';

// Shipping provider configuration
export interface ShippingProviderConfig {
  id: ShippingProviderId;
  name: string;
  enabled: boolean;
  apiUrl: string;
  apiKey?: string;
  apiSecret?: string;
  sandbox: boolean;
  webhookSecret?: string;
}

// Pickup point (e.g., InPost Paczkomat)
export interface PickupPoint {
  id: string;
  code: string;
  name: string;
  type: 'paczkomat' | 'punkt' | 'pop';
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  openingHours?: string;
  paymentAvailable?: boolean;
  functions?: string[];
}

// Shipping rate calculation request
export interface ShippingRateRequest {
  providerId: ShippingProviderId;
  origin: {
    postalCode: string;
    city: string;
    country: string;
  };
  destination: {
    postalCode: string;
    city: string;
    country: string;
  };
  packages: {
    weight: number; // kg
    dimensions?: {
      length: number; // cm
      width: number;
      height: number;
    };
  }[];
  pickupPointCode?: string;
}

// Shipping rate response
export interface ShippingRate {
  providerId: ShippingProviderId;
  serviceType: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDeliveryDays: {
    min: number;
    max: number;
  };
  estimatedDeliveryDate?: string;
  pickupPointRequired: boolean;
}

// Shipment creation request
export interface CreateShipmentRequest {
  orderId: string;
  providerId: ShippingProviderId;
  serviceType: string;
  sender: {
    name: string;
    company?: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  recipient: {
    name: string;
    company?: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  pickupPoint?: {
    code: string;
  };
  packages: {
    weight: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    reference?: string;
  }[];
  insurance?: {
    amount: number;
    currency: string;
  };
  cod?: {
    amount: number;
    currency: string;
  };
  reference?: string;
}

// Shipment response
export interface Shipment {
  id: string;
  orderId: string;
  providerId: ShippingProviderId;
  trackingNumber: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  labelUrl?: string;
  labelFormat?: 'PDF' | 'ZPL' | 'PNG';
  createdAt: Date;
  updatedAt: Date;
}

export type ShipmentStatus = 
  | 'created'
  | 'label_generated'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'exception'
  | 'cancelled';

// Tracking event
export interface TrackingEvent {
  timestamp: Date;
  status: ShipmentStatus;
  description: string;
  location?: string;
}

// Tracking response
export interface TrackingInfo {
  trackingNumber: string;
  providerId: ShippingProviderId;
  status: ShipmentStatus;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

// Webhook payload from shipping providers
export interface ShippingWebhookPayload {
  providerId: ShippingProviderId;
  eventType: 'status_update' | 'delivered' | 'exception' | 'returned';
  trackingNumber: string;
  status: ShipmentStatus;
  timestamp: Date;
  details?: Record<string, any>;
}
