/**
 * Analyze products in "Inne" to find common words/patterns
 * This helps expand the keyword dictionary
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeInneProducts() {
  console.log('=== ANALIZA PRODUKTÓW W KATEGORII "INNE" ===\n');
  
  try {
    const inneCat = await prisma.category.findUnique({
      where: { slug: 'inne' }
    });
    
    if (!inneCat) {
      console.log('Kategoria "Inne" nie istnieje!');
      return;
    }
    
    const products = await prisma.product.findMany({
      where: { categoryId: inneCat.id },
      select: { name: true },
      take: 500 // Analyze sample
    });
    
    console.log(`Analizuję ${products.length} produktów z "Inne"\n`);
    
    // Extract common words (2+ characters)
    const wordCounts = {};
    
    for (const p of products) {
      const words = p.name.toLowerCase()
        .replace(/[^\w\sąćęłńóśźż-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3);
      
      for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    // Sort by frequency
    const sortedWords = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100);
    
    console.log('=== TOP 100 NAJCZĘSTSZYCH SŁÓW ===\n');
    for (const [word, count] of sortedWords) {
      if (count >= 3) {
        console.log(`  "${word}": ${count}`);
      }
    }
    
    // Show sample product names
    console.log('\n=== PRZYKŁADOWE NAZWY PRODUKTÓW ===\n');
    const uniquePatterns = new Set();
    
    for (const p of products.slice(0, 100)) {
      // Extract first 2-3 words as pattern
      const pattern = p.name.split(/\s+/).slice(0, 3).join(' ');
      if (!uniquePatterns.has(pattern)) {
        uniquePatterns.add(pattern);
        console.log(`  ${p.name.substring(0, 80)}...`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeInneProducts();
