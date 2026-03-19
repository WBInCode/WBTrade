import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Cache directory for proxied images
const CACHE_DIR = path.join(__dirname, '../../image-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Allowed image extensions
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);

// Map content-type to extension
const CONTENT_TYPE_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

function urlToHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function getCachePath(hash: string, ext: string): string {
  // Use 2-level directory structure to avoid too many files in one dir
  const dir = path.join(CACHE_DIR, hash.substring(0, 2), hash.substring(2, 4));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `${hash}${ext}`);
}

function findCachedFile(hash: string): string | null {
  const subdir = path.join(CACHE_DIR, hash.substring(0, 2), hash.substring(2, 4));
  if (!fs.existsSync(subdir)) return null;
  
  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = path.join(subdir, `${hash}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * GET /api/img?url=<encoded_url>
 * Proxies and caches external product images.
 * On first request: fetches from source, saves to disk cache, serves to client.
 * On subsequent requests: serves directly from disk cache.
 * If source is down but image is cached: serves from cache.
 */
router.get('/', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs allowed' });
  }

  // Block private/internal IPs (SSRF protection)
  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname === '[::1]' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return res.status(403).json({ error: 'Private URLs not allowed' });
  }

  const hash = urlToHash(imageUrl);
  
  // Check cache first
  const cachedPath = findCachedFile(hash);
  if (cachedPath) {
    const ext = path.extname(cachedPath);
    const contentType = getContentType(ext);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Cache', 'HIT');
    return fs.createReadStream(cachedPath).pipe(res);
  }

  // Fetch from source
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WBTrade-ImageProxy/1.0',
        'Accept': 'image/*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Source returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    const ext = CONTENT_TYPE_MAP[contentType.split(';')[0].trim()] || '.jpg';
    
    const cachePath = getCachePath(hash, ext);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Sanity check - don't cache empty or suspiciously small files
    if (buffer.length < 100) {
      return res.status(502).json({ error: 'Image too small, likely an error page' });
    }

    // Write to cache
    fs.writeFileSync(cachePath, buffer);

    // Serve
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Cache', 'MISS');
    return res.send(buffer);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Source timeout' });
    }
    return res.status(502).json({ error: 'Failed to fetch image' });
  }
});

/**
 * GET /api/img/stats
 * Returns cache statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  function scanDir(dir: string, stats: { totalFiles: number; totalSize: number }) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full, stats);
      } else {
        stats.totalFiles++;
        stats.totalSize += fs.statSync(full).size;
      }
    }
  }

  try {
    const stats = { totalFiles: 0, totalSize: 0 };
    scanDir(CACHE_DIR, stats);

    res.json({
      cachedImages: stats.totalFiles,
      totalSizeMB: Math.round(stats.totalSize / 1024 / 1024 * 100) / 100,
      cacheDir: CACHE_DIR,
    });
  } catch {
    res.json({ cachedImages: 0, totalSizeMB: 0 });
  }
});

export default router;
