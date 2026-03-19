import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db';

const router = Router();

// Cache directory for proxied images
const CACHE_DIR = path.join(__dirname, '../../image-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Map content-type to extension
const CONTENT_TYPE_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

// Allowed image extensions for cache lookup
const CACHE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];

function urlToHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function getCachePath(hash: string, ext: string): string {
  const dir = path.join(CACHE_DIR, hash.substring(0, 2), hash.substring(2, 4));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `${hash}${ext}`);
}

function findCachedFile(hash: string): string | null {
  const subdir = path.join(CACHE_DIR, hash.substring(0, 2), hash.substring(2, 4));
  if (!fs.existsSync(subdir)) return null;
  
  for (const ext of CACHE_EXTENSIONS) {
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

async function fetchAndCacheImage(imageUrl: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WBTrade-ImageProxy/1.0',
        'Accept': 'image/*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = CONTENT_TYPE_MAP[contentType.split(';')[0].trim()] || '.jpg';
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length < 100) return null;

    const hash = urlToHash(imageUrl);
    const cachePath = getCachePath(hash, ext);
    fs.writeFileSync(cachePath, buffer);

    return { buffer, contentType };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * GET /api/img/stats
 * Returns cache statistics (must be before /:imageId to not be caught by it)
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

/**
 * GET /api/img/:imageId
 * Serves a product image by its database ID, with disk caching.
 * The URL is fetched from the ProductImage table — no user-provided URL reaches fetch().
 */
router.get('/:imageId', async (req: Request, res: Response) => {
  const { imageId } = req.params;
  
  if (!imageId) {
    return res.status(400).json({ error: 'Missing image ID' });
  }

  // Look up the image URL from the database (trusted source)
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { url: true },
  });

  if (!image || !image.url) {
    return res.status(404).json({ error: 'Image not found' });
  }

  // The URL comes from our database, not from user input
  const trustedUrl = image.url;
  const hash = urlToHash(trustedUrl);

  // Check disk cache first
  const cachedPath = findCachedFile(hash);
  if (cachedPath) {
    const ext = path.extname(cachedPath);
    res.setHeader('Content-Type', getContentType(ext));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Cache', 'HIT');
    return fs.createReadStream(cachedPath).pipe(res);
  }

  // Fetch from the original source and cache
  const result = await fetchAndCacheImage(trustedUrl);
  if (!result) {
    return res.status(502).json({ error: 'Failed to fetch image from source' });
  }

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Cache', 'MISS');
  return res.send(result.buffer);
});

export default router;
