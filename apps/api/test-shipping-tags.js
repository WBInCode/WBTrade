/**
 * Test tagów dostawy - sprawdzenie logiki shipping calculator
 * 
 * Scenariusze:
 * 1. Produkt z tagiem "Paczkomaty i Kurier" - dostępny paczkomat i kurier InPost
 * 2. Produkt z tagiem "Tylko kurier" - tylko kurier, brak paczkomatu
 * 3. Produkt z tagiem "XX.XX Gabaryt" - gabaryt z ceną dostawy w tagu
 * 4. Produkt z tagiem "do X kg" - waga produktu
 * 5. Mix produktów z różnymi tagami
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import z serwisu
const TAG_PATTERNS = {
  GABARYT: /^((\d+(?:\.\d{2})?)\s*)?gabaryt$/i,
  TYLKO_KURIER: /^tylko\s*kurier$/i,
  WHOLESALER: /^(hurtownia[:\-_](.+)|Ikonka|BTP|HP|Gastro|Horeca|Hurtownia\s+Przemysłowa|Leker|Forcetop)$/i,
  // Supports "produkt w paczce: 3" or "3 produkty w paczce"
  PACZKOMAT_LIMIT: /^(?:produkt\s*w\s*paczce[:\s]*(\d+)|(\d+)\s*produkt(?:y|ów)?\s*w\s*paczce)$/i,
  COURIER_ONLY: /^(tylko\s*kurier)$/i,
  PACZKOMAT_AVAILABLE: /^(paczkomaty?\s*(i\s*kurier)?|paczkomat)$/i,
  INPOST_ONLY: /^paczkomaty?\s*i\s*kurier$/i,
  // Supports "do 10 kg" or "do 31,5 kg"
  WEIGHT_TAG: /^do\s*(\d+(?:[,\.]\d+)?)\s*kg$/i,
};

function analyzeProductTags(tags) {
  const result = {
    isGabaryt: false,
    gabarytPrice: null,
    isTylkoKurier: false,
    wholesaler: null,
    paczkomatLimit: 10,
    isPaczkomatAvailable: false,
    isInPostOnly: false,
    weightKg: null,
    rawTags: tags,
  };

  for (const tag of tags) {
    // Gabaryt
    const gabarytMatch = tag.match(TAG_PATTERNS.GABARYT);
    if (gabarytMatch) {
      result.isGabaryt = true;
      if (gabarytMatch[2]) {
        result.gabarytPrice = parseFloat(gabarytMatch[2]);
      }
    }

    // Tylko kurier
    if (TAG_PATTERNS.TYLKO_KURIER.test(tag)) {
      result.isTylkoKurier = true;
      result.isGabaryt = true; // Tylko kurier traktowany jak gabaryt
    }

    // Hurtownia
    const wholesalerMatch = tag.match(TAG_PATTERNS.WHOLESALER);
    if (wholesalerMatch) {
      result.wholesaler = wholesalerMatch[2] || wholesalerMatch[1] || tag;
    }

    // Limit paczkomatu
    const limitMatch = tag.match(TAG_PATTERNS.PACZKOMAT_LIMIT);
    if (limitMatch) {
      result.paczkomatLimit = parseInt(limitMatch[1], 10);
    }

    // Paczkomat dostępny
    if (TAG_PATTERNS.PACZKOMAT_AVAILABLE.test(tag)) {
      result.isPaczkomatAvailable = true;
    }

    // InPost only
    if (TAG_PATTERNS.INPOST_ONLY.test(tag)) {
      result.isInPostOnly = true;
    }

    // Waga
    const weightMatch = tag.match(TAG_PATTERNS.WEIGHT_TAG);
    if (weightMatch) {
      result.weightKg = parseInt(weightMatch[1], 10);
    }
  }

  return result;
}

function getShippingDecision(analysis) {
  if (analysis.isGabaryt || analysis.isTylkoKurier) {
    return {
      method: 'Kurier (gabaryt)',
      paczkomat: false,
      reason: analysis.gabarytPrice 
        ? `Gabaryt z ceną ${analysis.gabarytPrice} PLN` 
        : 'Produkt gabarytowy/tylko kurier',
    };
  }

  if (analysis.isPaczkomatAvailable) {
    return {
      method: 'Paczkomat lub Kurier InPost',
      paczkomat: true,
      reason: 'Tag "Paczkomaty i Kurier" - dostępny paczkomat',
    };
  }

  // Produkty z tagami wagi "do X kg" bez innych tagów dostawy
  if (analysis.weightKg) {
    return {
      method: 'Kurier standardowy',
      paczkomat: false,
      reason: `Produkt do ${analysis.weightKg} kg - tylko kurier`,
    };
  }

  return {
    method: 'Brak określonej metody',
    paczkomat: false,
    reason: 'Brak tagów dostawy',
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TEST TAGÓW DOSTAWY - SHIPPING CALCULATOR               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Statystyki tagów
  console.log('═══ STATYSTYKI TAGÓW ═══\n');

  const tagStats = {
    'Paczkomaty i Kurier': 0,
    'Tylko kurier': 0,
    'Gabaryt (z ceną)': 0,
    'do X kg': 0,
    'produkt w paczce': 0,
    'Bez tagów dostawy': 0,
  };

  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, tags: true },
  });

  for (const product of allProducts) {
    const tags = product.tags || [];
    let hasDeliveryTag = false;

    for (const tag of tags) {
      if (TAG_PATTERNS.PACZKOMAT_AVAILABLE.test(tag)) {
        tagStats['Paczkomaty i Kurier']++;
        hasDeliveryTag = true;
      }
      if (TAG_PATTERNS.TYLKO_KURIER.test(tag)) {
        tagStats['Tylko kurier']++;
        hasDeliveryTag = true;
      }
      if (TAG_PATTERNS.GABARYT.test(tag)) {
        tagStats['Gabaryt (z ceną)']++;
        hasDeliveryTag = true;
      }
      if (TAG_PATTERNS.WEIGHT_TAG.test(tag)) {
        tagStats['do X kg']++;
        hasDeliveryTag = true;
      }
      if (TAG_PATTERNS.PACZKOMAT_LIMIT.test(tag)) {
        tagStats['produkt w paczce']++;
      }
    }

    if (!hasDeliveryTag) {
      tagStats['Bez tagów dostawy']++;
    }
  }

  console.log('Rozkład tagów dostawy:');
  for (const [tag, count] of Object.entries(tagStats)) {
    console.log(`  ${tag}: ${count}`);
  }

  // 2. Przykładowe produkty dla każdego scenariusza
  console.log('\n═══ PRZYKŁADOWE PRODUKTY ═══\n');

  // Paczkomat
  const paczkomatProducts = await prisma.product.findMany({
    where: { tags: { has: 'Paczkomaty i Kurier' } },
    select: { name: true, sku: true, tags: true },
    take: 3,
  });
  console.log('📦 Produkty z "Paczkomaty i Kurier":');
  for (const p of paczkomatProducts) {
    const analysis = analyzeProductTags(p.tags);
    const decision = getShippingDecision(analysis);
    console.log(`  - ${p.sku}: ${p.name.substring(0, 50)}...`);
    console.log(`    Tagi: ${JSON.stringify(p.tags)}`);
    console.log(`    Decyzja: ${decision.method} (${decision.reason})`);
  }

  // Tylko kurier
  const kurierProducts = await prisma.product.findMany({
    where: { tags: { has: 'Tylko kurier' } },
    select: { name: true, sku: true, tags: true },
    take: 3,
  });
  console.log('\n🚚 Produkty z "Tylko kurier":');
  for (const p of kurierProducts) {
    const analysis = analyzeProductTags(p.tags);
    const decision = getShippingDecision(analysis);
    console.log(`  - ${p.sku}: ${p.name.substring(0, 50)}...`);
    console.log(`    Tagi: ${JSON.stringify(p.tags)}`);
    console.log(`    Decyzja: ${decision.method} (${decision.reason})`);
  }

  // Gabaryt z ceną
  const gabarytProducts = await prisma.product.findMany({
    where: {
      tags: {
        hasSome: ['19.00 Gabaryt', '49.00 Gabaryt', '99.00 Gabaryt', '149.00 Gabaryt', '199.00 Gabaryt', '249.00 Gabaryt', '349.00 Gabaryt'],
      },
    },
    select: { name: true, sku: true, tags: true },
    take: 3,
  });
  console.log('\n📐 Produkty gabarytowe (z ceną):');
  for (const p of gabarytProducts) {
    const analysis = analyzeProductTags(p.tags);
    const decision = getShippingDecision(analysis);
    console.log(`  - ${p.sku}: ${p.name.substring(0, 50)}...`);
    console.log(`    Tagi: ${JSON.stringify(p.tags)}`);
    console.log(`    Decyzja: ${decision.method} | Cena gabaryt: ${analysis.gabarytPrice} PLN`);
  }

  // do X kg
  const weightProducts = await prisma.product.findMany({
    where: {
      tags: {
        hasSome: ['do 2 kg', 'do 3 kg', 'do 5 kg', 'do 10 kg', 'do 15 kg', 'do 20 kg', 'do 25 kg', 'do 30 kg'],
      },
    },
    select: { name: true, sku: true, tags: true },
    take: 3,
  });
  console.log('\n⚖️ Produkty z wagą (do X kg):');
  for (const p of weightProducts) {
    const analysis = analyzeProductTags(p.tags);
    const decision = getShippingDecision(analysis);
    console.log(`  - ${p.sku}: ${p.name.substring(0, 50)}...`);
    console.log(`    Tagi: ${JSON.stringify(p.tags)}`);
    console.log(`    Decyzja: ${decision.method} | Waga: do ${analysis.weightKg} kg`);
  }

  // 3. Test logiki z różnymi kombinacjami
  console.log('\n═══ TEST KOMBINACJI TAGÓW ═══\n');

  const testCases = [
    { tags: ['Ikonka', 'Paczkomaty i Kurier'], desc: 'Ikonka + Paczkomat' },
    { tags: ['BTP', 'Tylko kurier', 'do 10 kg'], desc: 'BTP + Tylko kurier + 10kg' },
    { tags: ['Hurtownia Przemysłowa', '149.00 Gabaryt'], desc: 'HP + Gabaryt 149zł' },
    { tags: ['Leker', 'do 2 kg'], desc: 'Leker + 2kg' },
    { tags: ['Forcetop', 'Paczkomaty i Kurier', 'produkt w paczce: 3'], desc: 'Forcetop + Paczkomat + 3 w paczce' },
    { tags: ['Hurtownia Przemysłowa'], desc: 'HP bez tagu dostawy' },
  ];

  for (const tc of testCases) {
    const analysis = analyzeProductTags(tc.tags);
    const decision = getShippingDecision(analysis);
    console.log(`📋 ${tc.desc}`);
    console.log(`   Tagi: ${JSON.stringify(tc.tags)}`);
    console.log(`   Hurtownia: ${analysis.wholesaler}`);
    console.log(`   Gabaryt: ${analysis.isGabaryt} | Tylko kurier: ${analysis.isTylkoKurier}`);
    console.log(`   Paczkomat dostępny: ${analysis.isPaczkomatAvailable}`);
    console.log(`   ➤ Decyzja: ${decision.method}`);
    console.log(`   ➤ Powód: ${decision.reason}\n`);
  }

  // 4. Sprawdź czy wszystkie nowe tagi są rozpoznawane
  console.log('═══ WERYFIKACJA NOWYCH TAGÓW ═══\n');

  // Pobierz unikalne tagi
  const uniqueTags = new Set();
  for (const product of allProducts) {
    for (const tag of (product.tags || [])) {
      uniqueTags.add(tag);
    }
  }

  const unknownTags = [];
  for (const tag of uniqueTags) {
    let recognized = false;
    if (TAG_PATTERNS.GABARYT.test(tag)) recognized = true;
    if (TAG_PATTERNS.TYLKO_KURIER.test(tag)) recognized = true;
    if (TAG_PATTERNS.WHOLESALER.test(tag)) recognized = true;
    if (TAG_PATTERNS.PACZKOMAT_LIMIT.test(tag)) recognized = true;
    if (TAG_PATTERNS.PACZKOMAT_AVAILABLE.test(tag)) recognized = true;
    if (TAG_PATTERNS.WEIGHT_TAG.test(tag)) recognized = true;
    
    if (!recognized) {
      unknownTags.push(tag);
    }
  }

  console.log(`Wszystkich unikalnych tagów: ${uniqueTags.size}`);
  console.log(`Nierozpoznanych tagów: ${unknownTags.length}`);
  
  if (unknownTags.length > 0) {
    console.log('\n⚠️ Nierozpoznane tagi (mogą wymagać obsługi):');
    // Pogrupuj i policz
    const tagCounts = {};
    for (const product of allProducts) {
      for (const tag of (product.tags || [])) {
        if (unknownTags.includes(tag)) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    
    Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([tag, count]) => {
        console.log(`  "${tag}": ${count} produktów`);
      });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
