/**
 * Image proxy helper — routes external product images through our API cache.
 * This ensures images remain available even when the original source is down.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'wbtrade.pl'
    ? 'https://wbtrade-iv71.onrender.com/api'
    : 'http://localhost:5000/api');

/**
 * Convert an external image URL into a proxied URL that goes through our API cache.
 * Returns the original URL unchanged if it's already a local/data URL.
 */
export function getProxiedImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // Don't proxy data: URIs, blob: URIs, or already-local URLs
  if (
    url.startsWith('data:') || 
    url.startsWith('blob:') || 
    url.startsWith('/') ||
    url.startsWith(API_BASE_URL)
  ) {
    return url;
  }

  return `${API_BASE_URL}/img?url=${encodeURIComponent(url)}`;
}
