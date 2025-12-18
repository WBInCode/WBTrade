import { prisma } from '../db';

export interface WishlistItemWithProduct {
  id: string;
  productId: string;
  variantId: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    images: { url: string; alt: string | null }[];
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
  } | null;
}

export class WishlistService {
  /**
   * Get user's wishlist
   */
  async getWishlist(userId: string): Promise<WishlistItemWithProduct[]> {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        variant: true,
      },
    });

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      createdAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        compareAtPrice: item.product.compareAtPrice
          ? Number(item.product.compareAtPrice)
          : null,
        images: item.product.images,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            price: Number(item.variant.price),
            compareAtPrice: item.variant.compareAtPrice
              ? Number(item.variant.compareAtPrice)
              : null,
          }
        : null,
    }));
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(
    userId: string,
    productId: string,
    variantId?: string
  ): Promise<WishlistItemWithProduct> {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Produkt nie został znaleziony');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      // Return existing item
      return this.getWishlistItem(existing.id);
    }

    // Create new wishlist item
    const item = await prisma.wishlistItem.create({
      data: {
        userId,
        productId,
        variantId: variantId || null,
      },
    });

    return this.getWishlistItem(item.id);
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
    return !!item;
  }

  /**
   * Clear user's wishlist
   */
  async clearWishlist(userId: string): Promise<void> {
    await prisma.wishlistItem.deleteMany({
      where: { userId },
    });
  }

  /**
   * Merge local wishlist with user's wishlist (called after login)
   */
  async mergeWishlist(
    userId: string,
    localItems: { productId: string; variantId?: string }[]
  ): Promise<WishlistItemWithProduct[]> {
    // Add each local item if not already in wishlist
    for (const item of localItems) {
      try {
        await this.addToWishlist(userId, item.productId, item.variantId);
      } catch (error) {
        // Ignore errors (product might not exist anymore)
        console.error('Failed to merge wishlist item:', error);
      }
    }

    return this.getWishlist(userId);
  }

  /**
   * Get single wishlist item
   */
  private async getWishlistItem(id: string): Promise<WishlistItemWithProduct> {
    const item = await prisma.wishlistItem.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            images: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        variant: true,
      },
    });

    if (!item) {
      throw new Error('Wishlist item not found');
    }

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      createdAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        compareAtPrice: item.product.compareAtPrice
          ? Number(item.product.compareAtPrice)
          : null,
        images: item.product.images,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            price: Number(item.variant.price),
            compareAtPrice: item.variant.compareAtPrice
              ? Number(item.variant.compareAtPrice)
              : null,
          }
        : null,
    };
  }
}

export const wishlistService = new WishlistService();
