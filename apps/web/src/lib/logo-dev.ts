// Logo.dev configuration
// Get your API key from https://logo.dev

export const LOGO_DEV_API_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY || '';

// Helper function to generate logo.dev URL
export function getLogoUrl(domain: string, options?: { size?: number; format?: 'png' | 'jpg' | 'webp'; greyscale?: boolean }) {
  const { size = 128, format = 'png', greyscale = false } = options || {};
  
  if (!LOGO_DEV_API_KEY) {
    console.warn('Logo.dev API key not set. Add NEXT_PUBLIC_LOGO_DEV_API_KEY to your .env.local');
    return null;
  }
  
  let url = `https://img.logo.dev/${domain}?token=${LOGO_DEV_API_KEY}&size=${size}&format=${format}`;
  if (greyscale) {
    url += '&greyscale=true';
  }
  return url;
}

// Payment provider domains for logo.dev
export const PAYMENT_LOGOS = {
  visa: 'visa.com',
  mastercard: 'mastercard.com',
  blik: 'groupone.pl',
  payu: 'payu.com',
  przelewy24: 'przelewy24.pl',
  paypal: 'paypal.com',
  applepay: 'apple.com',
  googlepay: 'google.com',
} as const;

// Social media domains for logo.dev
export const SOCIAL_LOGOS = {
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  twitter: 'x.com',
  linkedin: 'linkedin.com',
  linktree: 'linktr.ee',
  youtube: 'youtube.com',
  tiktok: 'tiktok.com',
} as const;
