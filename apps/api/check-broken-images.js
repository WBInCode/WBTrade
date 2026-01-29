/**
 * Skrypt do wykrywania i ukrywania produktów z problemami ze zdjęciami
 * 
 * Użycie:
 *   node check-broken-images.js          - tylko analiza (bez zmian)
 *   node check-broken-images.js --hide   - ukryj produkty z problemami
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

const HIDE_MODE = process.argv.includes('--hide');
const CHECK_URLS = process.argv.includes('--check-urls'); // sprawdź czy URLe działają (wolne!)

// Wzorce wskazujące na problematyczne zdjęcia
const BROKEN_PATTERNS = [
  /placeholder/i,
  /no-image/i,
  /noimage/i,
  /default\.(jpg|png|gif)/i,
  /missing/i,
  /blank/i,
  /empty/i,
  /error/i,
  /404/i,
];

// Minimalna długość URL (zbyt krótkie to pewnie błędy)
const MIN_URL_LENGTH = 20;

async function checkImageUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, { timeout }, (res) => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          contentType: res.headers['content-type']
        });
      });
      
      req.on('error', () => resolve({ ok: false, status: 0, error: 'network' }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, error: 'timeout' });
      });
    } catch (e) {
      resolve({ ok: false, status: 0, error: e.message });
    }
  });
}

function isBrokenUrl(url) {
  if (!url || typeof url !== 'string') return true;
  if (url.trim().length < MIN_URL_LENGTH) return true;
  
  for (const pattern of BROKEN_PATTERNS) {
    if (pattern.test(url)) return true;
  }
  
  // Sprawdź czy to poprawny URL
  try {
    new URL(url);
  } catch {
    return true;
  }
  
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 ANALIZA PRODUKTÓW Z PROBLEMAMI ZE ZDJĘCIAMI');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  
  if (HIDE_MODE) {
    console.log('⚠️  TRYB UKRYWANIA - produkty z problemami zostaną ukryte\n');
  } else {
    console.log('ℹ️  TRYB ANALIZY - tylko podgląd (użyj --hide żeby ukryć)\n');
  }

  // 1. Statystyki ogólne
  console.log('📊 KROK 1: Statystyki ogólne...\n');
  
  const totalProducts = await prisma.product.count();
  const visibleProducts = await prisma.product.count({ where: { status: 'ACTIVE' } });
  const productsWithImages = await prisma.product.count({
    where: { images: { some: {} } }
  });
  const productsWithoutImages = await prisma.product.count({
    where: { images: { none: {} } }
  });
  
  console.log(`   Wszystkich produktów: ${totalProducts}`);
  console.log(`   Widocznych (status=ACTIVE): ${visibleProducts}`);
  console.log(`   Ze zdjęciami: ${productsWithImages}`);
  console.log(`   BEZ zdjęć: ${productsWithoutImages}`);
  
  // 2. Produkty bez zdjęć które są widoczne
  console.log('\n📊 KROK 2: Widoczne produkty BEZ zdjęć...\n');
  
  const visibleWithoutImages = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      images: { none: {} }
    },
    select: {
      id: true,
      name: true,
      sku: true
    }
  });
  
  console.log(`   Znaleziono: ${visibleWithoutImages.length} widocznych produktów bez zdjęć`);
  
  if (visibleWithoutImages.length > 0 && visibleWithoutImages.length <= 20) {
    console.log('\n   Przykłady:');
    visibleWithoutImages.slice(0, 10).forEach(p => {
      console.log(`      - [${p.sku}] ${p.name?.substring(0, 50)}`);
    });
  }

  // 3. Analiza URLi zdjęć
  console.log('\n📊 KROK 3: Analiza URLi zdjęć...\n');
  
  const allImages = await prisma.productImage.findMany({
    select: {
      id: true,
      url: true,
      productId: true
    }
  });
  
  console.log(`   Wszystkich zdjęć w bazie: ${allImages.length}`);
  
  const brokenImages = [];
  const emptyUrls = [];
  const shortUrls = [];
  const invalidUrls = [];
  
  for (const img of allImages) {
    if (!img.url || img.url.trim() === '') {
      emptyUrls.push(img);
    } else if (img.url.length < MIN_URL_LENGTH) {
      shortUrls.push(img);
    } else if (isBrokenUrl(img.url)) {
      brokenImages.push(img);
    } else {
      try {
        new URL(img.url);
      } catch {
        invalidUrls.push(img);
      }
    }
  }
  
  console.log(`   Puste URLe: ${emptyUrls.length}`);
  console.log(`   Za krótkie URLe (<${MIN_URL_LENGTH} znaków): ${shortUrls.length}`);
  console.log(`   Pasujące do wzorców "broken": ${brokenImages.length}`);
  console.log(`   Niepoprawne URLe: ${invalidUrls.length}`);

  // 4. Znajdź produkty których WSZYSTKIE zdjęcia są problematyczne
  console.log('\n📊 KROK 4: Produkty z samymi problematycznymi zdjęciami...\n');
  
  const problematicImageIds = new Set([
    ...emptyUrls.map(i => i.productId),
    ...shortUrls.map(i => i.productId),
    ...brokenImages.map(i => i.productId),
    ...invalidUrls.map(i => i.productId)
  ]);
  
  // Znajdź produkty gdzie wszystkie zdjęcia są problematyczne
  const productsWithOnlyBadImages = [];
  
  const productsToCheck = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { in: Array.from(problematicImageIds) }
    },
    select: {
      id: true,
      name: true,
      sku: true,
      images: {
        select: { url: true }
      }
    }
  });
  
  for (const product of productsToCheck) {
    const allBad = product.images.every(img => isBrokenUrl(img.url));
    if (allBad) {
      productsWithOnlyBadImages.push(product);
    }
  }
  
  console.log(`   Widoczne produkty z SAMYMI problematycznymi zdjęciami: ${productsWithOnlyBadImages.length}`);

  // 5. Opcjonalne sprawdzenie czy URLe działają
  if (CHECK_URLS) {
    console.log('\n📊 KROK 5: Sprawdzanie dostępności URLi (to może potrwać)...\n');
    
    // Sprawdź sample URLi
    const sampleSize = Math.min(100, allImages.length);
    const sample = allImages.slice(0, sampleSize);
    let brokenCount = 0;
    
    for (let i = 0; i < sample.length; i++) {
      const img = sample[i];
      if (img.url && !isBrokenUrl(img.url)) {
        const result = await checkImageUrl(img.url);
        if (!result.ok) {
          brokenCount++;
        }
      }
      
      if ((i + 1) % 20 === 0) {
        console.log(`   Sprawdzono ${i + 1}/${sampleSize}...`);
      }
    }
    
    console.log(`   Niedostępnych URLi w próbce: ${brokenCount}/${sampleSize}`);
  }

  // 6. Podsumowanie - co ukryć
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📋 PODSUMOWANIE - PRODUKTY DO UKRYCIA');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  
  const toHide = new Set();
  
  // Dodaj produkty bez zdjęć
  visibleWithoutImages.forEach(p => toHide.add(p.id));
  
  // Dodaj produkty z samymi złymi zdjęciami
  productsWithOnlyBadImages.forEach(p => toHide.add(p.id));
  
  const toHideIds = Array.from(toHide);
  
  console.log(`   Produkty bez zdjęć: ${visibleWithoutImages.length}`);
  console.log(`   Produkty z samymi złymi zdjęciami: ${productsWithOnlyBadImages.length}`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   RAZEM DO UKRYCIA: ${toHideIds.length}`);
  
  if (toHideIds.length > 0) {
    // Pokaż przykłady
    const examples = await prisma.product.findMany({
      where: { id: { in: toHideIds.slice(0, 15) } },
      select: { sku: true, name: true },
    });
    
    console.log('\n   Przykłady produktów do ukrycia:');
    examples.forEach(p => {
      console.log(`      - [${p.sku}] ${p.name?.substring(0, 50)}`);
    });
    
    if (toHideIds.length > 15) {
      console.log(`      ... i ${toHideIds.length - 15} więcej`);
    }
  }

  // 7. Ukryj produkty jeśli tryb --hide
  if (HIDE_MODE && toHideIds.length > 0) {
    console.log('\n🔄 UKRYWANIE PRODUKTÓW (status -> DRAFT)...\n');
    
    const result = await prisma.product.updateMany({
      where: { id: { in: toHideIds } },
      data: { status: 'DRAFT' }
    });
    
    console.log(`   ✅ Ukryto ${result.count} produktów (status zmieniony na DRAFT)`);
  } else if (!HIDE_MODE && toHideIds.length > 0) {
    console.log('\n💡 Aby ukryć te produkty, uruchom:');
    console.log('   node check-broken-images.js --hide\n');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Błąd:', e);
  await prisma.$disconnect();
  process.exit(1);
});
