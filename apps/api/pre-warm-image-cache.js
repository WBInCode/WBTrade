/**
 * Pre-warm the image proxy cache by downloading all product images.
 * Run this after deployment to ensure all images are cached before users visit.
 * 
 * Usage: node pre-warm-image-cache.js [--batch-size=50] [--delay=200]
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

const CACHE_DIR = path.join(__dirname, 'image-cache');
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50');
const DELAY_MS = parseInt(process.argv.find(a => a.startsWith('--delay='))?.split('=')[1] || '200');

const CONTENT_TYPE_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

function urlToHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function getCachePath(hash, ext) {
  const dir = path.join(CACHE_DIR, hash.substring(0, 2), hash.substring(2, 4));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${hash}${ext}`);
}

function isCached(hash) {
  const subdir = path.join(CACHE_DIR, hash.substring(0, 2), hash.substring(2, 4));
  if (!fs.existsSync(subdir)) return false;
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
  return exts.some(ext => fs.existsSync(path.join(subdir, `${hash}${ext}`)));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log('📸 Pre-warming image cache...');
  console.log(`   Batch size: ${BATCH_SIZE}, Delay: ${DELAY_MS}ms\n`);

  const images = await prisma.productImage.findMany({
    select: { url: true },
  });

  console.log(`Found ${images.length} product images total`);

  let cached = 0;
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (img) => {
      const url = img.url;
      if (!url) { skipped++; return; }

      const hash = urlToHash(url);
      if (isCached(hash)) { cached++; return; }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'WBTrade-ImageProxy/1.0', Accept: 'image/*' },
        });
        clearTimeout(timeout);

        if (!response.ok) { failed++; return; }

        const contentType = response.headers.get('content-type') || '';
        const ext = CONTENT_TYPE_MAP[contentType.split(';')[0].trim()] || '.jpg';
        const buffer = Buffer.from(await response.arrayBuffer());
        
        if (buffer.length < 100) { failed++; return; }
        
        fs.writeFileSync(getCachePath(hash, ext), buffer);
        downloaded++;
      } catch {
        failed++;
      }
    });

    await Promise.all(promises);
    
    const total = cached + downloaded + failed + skipped;
    const pct = ((total / images.length) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${total}/${images.length} (${pct}%) - ✅ cached: ${cached}, ⬇️ downloaded: ${downloaded}, ❌ failed: ${failed}`);
    
    if (i + BATCH_SIZE < images.length) await sleep(DELAY_MS);
  }

  console.log('\n');
  console.log('✅ Pre-warm complete!');
  console.log(`   Already cached: ${cached}`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);

  // Calculate cache size
  let totalSize = 0;
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scanDir(full);
      else totalSize += fs.statSync(full).size;
    }
  }
  scanDir(CACHE_DIR);
  console.log(`   Cache size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
