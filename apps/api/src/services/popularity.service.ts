import { prisma } from '../db';

/**
 * Serwis do zarządzania popularnością produktów
 * 
 * Logika obliczania popularityScore:
 * - salesCount (waga: 3) - liczba sprzedanych sztuk
 * - viewCount (waga: 1) - liczba wyświetleń produktu
 * 
 * Wzór: popularityScore = (salesCount * 3) + (viewCount * 0.1)
 * 
 * Dodatkowe czynniki które mogą być uwzględnione w przyszłości:
 * - Czas od ostatniej sprzedaży (świeżość)
 * - Dostępność na magazynie
 * - Cena względem średniej w kategorii
 */
export const popularityService = {
  /**
   * Oblicza i aktualizuje popularityScore dla wszystkich produktów
   */
  async recalculateAllPopularityScores(): Promise<{ updated: number }> {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        viewCount: true,
        salesCount: true,
      },
    });

    let updated = 0;

    for (const product of products) {
      const score = this.calculateScore(product.salesCount, product.viewCount);
      
      await prisma.product.update({
        where: { id: product.id },
        data: { popularityScore: score },
      });
      
      updated++;
    }

    return { updated };
  },

  /**
   * Oblicza popularityScore dla pojedynczego produktu
   */
  calculateScore(salesCount: number, viewCount: number): number {
    // Waga sprzedaży: 3x ważniejsza niż wyświetlenia
    const salesWeight = 3;
    const viewWeight = 0.1;
    
    return (salesCount * salesWeight) + (viewCount * viewWeight);
  },

  /**
   * Zwiększa licznik wyświetleń produktu
   */
  async incrementViewCount(productId: string): Promise<void> {
    await prisma.product.update({
      where: { id: productId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  },

  /**
   * Zwiększa licznik sprzedaży produktu i przelicza popularność
   */
  async incrementSalesCount(productId: string, quantity: number = 1): Promise<void> {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        salesCount: { increment: quantity },
      },
      select: {
        viewCount: true,
        salesCount: true,
      },
    });

    // Przelicz popularityScore po sprzedaży
    const newScore = this.calculateScore(product.salesCount, product.viewCount);
    
    await prisma.product.update({
      where: { id: productId },
      data: { popularityScore: newScore },
    });
  },

  /**
   * Aktualizuje popularityScore dla pojedynczego produktu
   */
  async updateProductPopularity(productId: string): Promise<number> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        viewCount: true,
        salesCount: true,
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const score = this.calculateScore(product.salesCount, product.viewCount);
    
    await prisma.product.update({
      where: { id: productId },
      data: { popularityScore: score },
    });

    return score;
  },
};

export default popularityService;
