const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Test the gabaryt detection logic
const TAG_PATTERNS = {
  GABARYT: /^((\d+(?:\.\d{2})?)\s*)?gabaryt$/i,
  TYLKO_KURIER: /^tylko\s*kurier$/i,
};

function isGabaryt(tags) {
  return tags.some(tag => TAG_PATTERNS.GABARYT.test(tag) || TAG_PATTERNS.TYLKO_KURIER.test(tag));
}

function getGabarytPrice(tags) {
  for (const tag of tags) {
    const match = tag.match(TAG_PATTERNS.GABARYT);
    if (match && match[2]) {
      return parseFloat(match[2]);
    }
  }
  return null;
}

async function main() {
  // Find frytkownica
  const frytkownica = await p.product.findFirst({
    where: { name: { contains: 'Frytkownica', mode: 'insensitive' } },
    select: { name: true, tags: true, sku: true }
  });
  
  console.log('=== FRYTKOWNICA ===');
  console.log('Name:', frytkownica?.name);
  console.log('Tags:', frytkownica?.tags);
  console.log('Is Gabaryt:', isGabaryt(frytkownica?.tags || []));
  console.log('Gabaryt Price:', getGabarytPrice(frytkownica?.tags || []));
  
  // Find szafka
  const szafka = await p.product.findFirst({
    where: { name: { contains: 'Szafka stalowa', mode: 'insensitive' } },
    select: { name: true, tags: true, sku: true }
  });
  
  console.log('\n=== SZAFKA ===');
  console.log('Name:', szafka?.name);
  console.log('Tags:', szafka?.tags);
  console.log('Is Gabaryt:', isGabaryt(szafka?.tags || []));
  console.log('Gabaryt Price:', getGabarytPrice(szafka?.tags || []));
}

main().finally(() => p.$disconnect());
