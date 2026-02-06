// TypeScript declarations for GTM dataLayer

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }
}

export interface DataLayerEvent {
  event?: string;
  ecommerce?: EcommerceData | null;
  [key: string]: unknown;
}

export interface EcommerceData {
  transaction_id?: string;
  value?: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  coupon?: string;
  items?: EcommerceItem[];
}

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  coupon?: string;
  discount?: number;
  index?: number;
}

/**
 * Push event to dataLayer
 */
export function pushToDataLayer(event: DataLayerEvent): void {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  }
}

/**
 * Clear ecommerce data before pushing new event
 * Recommended by Google to avoid data mixing
 */
export function clearEcommerce(): void {
  pushToDataLayer({ ecommerce: null });
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  pushToDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: pageTitle,
  });
}

/**
 * Track product view (view_item)
 */
export function trackViewItem(item: EcommerceItem, value: number, currency: string = 'PLN'): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency,
      value,
      items: [item],
    },
  });
}

/**
 * Track add to cart (add_to_cart)
 */
export function trackAddToCart(item: EcommerceItem, value: number, currency: string = 'PLN'): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency,
      value,
      items: [item],
    },
  });
}

/**
 * Track remove from cart (remove_from_cart)
 */
export function trackRemoveFromCart(item: EcommerceItem, value: number, currency: string = 'PLN'): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency,
      value,
      items: [item],
    },
  });
}

/**
 * Track view cart (view_cart)
 */
export function trackViewCart(items: EcommerceItem[], value: number, currency: string = 'PLN'): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_cart',
    ecommerce: {
      currency,
      value,
      items,
    },
  });
}

/**
 * Track begin checkout (begin_checkout)
 */
export function trackBeginCheckout(
  items: EcommerceItem[],
  value: number,
  coupon?: string,
  currency: string = 'PLN'
): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency,
      value,
      coupon,
      items,
    },
  });
}

/**
 * Track add shipping info (add_shipping_info)
 */
export function trackAddShippingInfo(
  items: EcommerceItem[],
  value: number,
  shippingTier: string,
  currency: string = 'PLN'
): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_shipping_info',
    ecommerce: {
      currency,
      value,
      shipping_tier: shippingTier,
      items,
    },
  });
}

/**
 * Track add payment info (add_payment_info)
 */
export function trackAddPaymentInfo(
  items: EcommerceItem[],
  value: number,
  paymentType: string,
  currency: string = 'PLN'
): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_payment_info',
    ecommerce: {
      currency,
      value,
      payment_type: paymentType,
      items,
    },
  });
}

/**
 * Track purchase (purchase)
 */
export function trackPurchase(
  transactionId: string,
  items: EcommerceItem[],
  value: number,
  shipping?: number,
  tax?: number,
  coupon?: string,
  currency: string = 'PLN'
): void {
  clearEcommerce();
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency,
      value,
      shipping,
      tax,
      coupon,
      items,
    },
  });
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string): void {
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
  });
}

/**
 * Track newsletter signup
 */
export function trackNewsletterSignup(email?: string): void {
  pushToDataLayer({
    event: 'newsletter_signup',
    method: 'email',
  });
}

/**
 * Track login
 */
export function trackLogin(method: string = 'email'): void {
  pushToDataLayer({
    event: 'login',
    method,
  });
}

/**
 * Track signup
 */
export function trackSignup(method: string = 'email'): void {
  pushToDataLayer({
    event: 'sign_up',
    method,
  });
}
