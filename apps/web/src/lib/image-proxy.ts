/**
 * Image proxy helper — routes product images through our API cache by image ID.
 * The API looks up the URL from the database (no user-provided URL in the request).
 * This ensures images remain available even when the original source is down.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'wbtrade.pl'
    ? 'https://wbtradeprod.onrender.com/api'
    : 'http://localhost:5000/api');

/**
 * Convert a ProductImage ID into a proxied URL that goes through our API cache.
 */
export function getProxiedImageUrl(imageId: string): string {
  if (!imageId) return '';
  return `${API_BASE_URL}/img/${imageId}`;
}
