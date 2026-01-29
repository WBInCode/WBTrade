/**
 * Skrypt do wykrywania produktów z niedostępnymi zdjęciami (403, 404, timeout)
 * 
 * Użycie:
 *   node check-image-urls.js              - sprawdź próbkę 500 produktów
 *   node check-image-urls.js --full       - sprawdź WSZYSTKIE produkty (długie!)
 *   node check-image-urls.js --hide       - ukryj produkty z błędnymi zdjęciami
 *   node check-image-urls.js --domain b2b.leker.pl  - tylko produkty z tego domeny
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

const HIDE_MODE = process.argv.includes('--hide');
const FULL_MODE = process.argv.includes('--full');
const DOMAIN_FILTER = process.argv.find(a => a.startsWith('--domain='))?.split('=')[1] || null;

// Ile produktów sprawdzić (jeśli nie --full)
const SAMPLE_SIZE = 500;
// Timeout dla sprawdzania URL (ms)
const URL_TIMEOUT = 8000;
// Ile równoczesnych requestów
const CONCURRENT_REQUESTS = 10;

async function checkImageUrl(url, timeout = URL_TIMEOUT) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, { timeout }, (res) => {
        // Odpowiedź 403, 404, 500+ to błąd
        const isImage = res.headers['content-type']?.startsWith('image/');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400 && isImage,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          isImage
        });
      });
      
      req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, error: 'timeout' });
      });
    } catch (e) {
      resolve({ ok: false, status: 0, error: e.message });
    }
  });
}

// Sprawdź wiele URLi równolegle (z limitem)
async function checkUrlsBatch(urls, concurrency = CONCURRENT_REQUESTS) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async ({ url, productId }) => {
        const result = await checkImageUrl(url);
        return { url, productId, ...result };
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 SPRAWDZANIE DOSTĘPNOŚCI ZDJĘĆ PRODUKTÓW');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  
  if (HIDE_MODE) {
    console.log('⚠️  TRYB UKRYWANIA - produkty z błędnymi zdjęciami zostaną ukryte\n');
  } else {
    console.log('ℹ️  TRYB ANALIZY - tylko podgląd (użyj --hide żeby ukryć)\n');
  }
  
  if (DOMAIN_FILTER) {
    console.log(`📌 Filtr domeny: ${DOMAIN_FILTER}\n`);
  }

  // 1. Pobierz produkty ze zdjęciami
  console.log('📊 KROK 1: Pobieranie produktów...\n');
  
  let whereClause = {
    status: 'ACTIVE',
    images: { some: {} }
  };
  
  const allProducts = await prisma.product.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      sku: true,
      images: {
        select: { url: true },
        take: 1 // tylko pierwsze zdjęcie na start
      }
    }
  });
  
  console.log(`   Znaleziono ${allProducts.length} aktywnych produktów ze zdjęciami`);
  
  // Filtruj po domenie jeśli podano
  let productsToCheck = allProducts;
  if (DOMAIN_FILTER) {
    productsToCheck = allProducts.filter(p => 
      p.images.some(img => img.url.includes(DOMAIN_FILTER))
    );
    console.log(`   Po filtrze domeny: ${productsToCheck.length} produktów`);
  }
  
  // Ogranicz do SAMPLE_SIZE jeśli nie --full
  if (!FULL_MODE && productsToCheck.length > SAMPLE_SIZE) {
    // Losowa próbka
    productsToCheck = productsToCheck
      .sort(() => Math.random() - 0.5)
      .slice(0, SAMPLE_SIZE);
    console.log(`   Sprawdzam próbkę: ${SAMPLE_SIZE} produktów (użyj --full dla wszystkich)`);
  }

  // 2. Sprawdź URLe zdjęć
  console.log('\n📊 KROK 2: Sprawdzanie URLi zdjęć...\n');
  
  const urlsToCheck = productsToCheck.map(p => ({
    url: p.images[0]?.url,
    productId: p.id,
    sku: p.sku,
    name: p.name
  })).filter(u => u.url);
  
  console.log(`   Do sprawdzenia: ${urlsToCheck.length} URLi`);
  console.log(`   Timeout: ${URL_TIMEOUT}ms, równolegle: ${CONCURRENT_REQUESTS}\n`);
  
  const brokenProducts = [];
  const statusCounts = {};
  
  // Sprawdzaj partiami i pokazuj postęp
  const batchSize = 50;
  for (let i = 0; i < urlsToCheck.length; i += batchSize) {
    const batch = urlsToCheck.slice(i, i + batchSize);
    const results = await checkUrlsBatch(batch);
    
    for (const result of results) {
      const statusKey = result.error || result.status;
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
      
      if (!result.ok) {
        const product = productsToCheck.find(p => p.id === result.productId);
        brokenProducts.push({
          id: result.productId,
          sku: product?.sku,
          name: product?.name,
          url: result.url,
          status: result.status,
          error: result.error,
          contentType: result.contentType
        });
      }
    }
    
    // Pokaż postęp
    const checked = Math.min(i + batchSize, urlsToCheck.length);
    const percent = Math.round(checked / urlsToCheck.length * 100);
    process.stdout.write(`\r   Postęp: ${checked}/${urlsToCheck.length} (${percent}%) - Błędnych: ${brokenProducts.length}`);
  }
  
  console.log('\n');

  // 3. Podsumowanie
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('📋 PODSUMOWANIE');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  
  console.log('   Status odpowiedzi:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const icon = status === '200' ? '✅' : '❌';
      console.log(`      ${icon} ${status}: ${count}`);
    });
  
  console.log(`\n   Produkty z błędnymi zdjęciami: ${brokenProducts.length}`);
  
  if (brokenProducts.length > 0) {
    console.log('\n   Przykłady:');
    brokenProducts.slice(0, 15).forEach(p => {
      console.log(`      - [${p.sku}] ${p.name?.substring(0, 40)} -> ${p.status || p.error}`);
    });
    
    if (brokenProducts.length > 15) {
      console.log(`      ... i ${brokenProducts.length - 15} więcej`);
    }
    
    // Grupuj po domenie
    const byDomain = {};
    brokenProducts.forEach(p => {
      try {
        const domain = new URL(p.url).hostname;
        byDomain[domain] = (byDomain[domain] || 0) + 1;
      } catch {}
    });
    
    console.log('\n   Błędy według domeny:');
    Object.entries(byDomain)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`      - ${domain}: ${count}`);
      });
  }

  // 4. Ukryj jeśli --hide
  if (HIDE_MODE && brokenProducts.length > 0) {
    console.log('\n🔄 UKRYWANIE PRODUKTÓW...\n');
    
    const idsToHide = brokenProducts.map(p => p.id);
    
    const result = await prisma.product.updateMany({
      where: { id: { in: idsToHide } },
      data: { status: 'DRAFT' }
    });
    
    console.log(`   ✅ Ukryto ${result.count} produktów (status -> DRAFT)`);
  } else if (!HIDE_MODE && brokenProducts.length > 0) {
    console.log('\n💡 Aby ukryć te produkty, uruchom:');
    console.log('   node check-image-urls.js --hide\n');
    
    if (!FULL_MODE) {
      console.log('💡 Aby sprawdzić WSZYSTKIE produkty:');
      console.log('   node check-image-urls.js --full\n');
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Błąd:', e);
  await prisma.$disconnect();
  process.exit(1);
});
