import { prisma } from '../db';
import { roundMoney } from '../lib/currency';

export interface CartWithItems {
  id: string;
  userId: string | null;
  sessionId: string | null;
  couponCode: string | null;
  items: CartItemWithProduct[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface CartItemWithProduct {
  id: string;
  quantity: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice: number | null;
    attributes: Record<string, string>;
    product: {
      id: string;
      name: string;
      slug: string;
      images: { url: string; alt: string | null }[];
      tags: string[];
      wholesaler: string | null;
    };
    inventory: { quantity: number; reserved: number }[];
  };
}

export class CartService {
  /**
   * Get or create cart for user or session
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<CartWithItems> {
    let cart = await this.findCart(userId, sessionId);

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId || null,
          sessionId: userId ? null : sessionId || null,
          expiresAt: userId ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for guest
        },
        include: this.cartInclude,
      });
    }

    return await this.formatCart(cart);
  }

  /**
   * Find existing cart
   */
  private async findCart(userId?: string, sessionId?: string) {
    if (userId) {
      return prisma.cart.findUnique({
        where: { userId },
        include: this.cartInclude,
      });
    }

    if (sessionId) {
      return prisma.cart.findUnique({
        where: { sessionId },
        include: this.cartInclude,
      });
    }

    return null;
  }

  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    variantId: string,
    quantity = 1
  ): Promise<CartWithItems> {
    // First, verify the variant exists and check stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: {
          select: { name: true, status: true }
        }
      }
    });

    if (!variant) {
      throw new Error(`Wariant o ID ${variantId} nie został znaleziony`);
    }

    // Check if product is active
    if (variant.product.status !== 'ACTIVE') {
      throw new Error(`Produkt "${variant.product.name}" jest niedostępny`);
    }

    // Calculate available stock
    const availableStock = variant.inventory.reduce(
      (sum, inv) => sum + (inv.quantity - inv.reserved), 
      0
    );

    // Check if item already exists in cart to calculate total quantity
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId, variantId },
      },
    });

    const totalRequestedQuantity = (existingItem?.quantity || 0) + quantity;

    // Validate stock availability
    if (availableStock <= 0) {
      throw new Error(`Produkt "${variant.product.name}" jest niedostępny (brak na stanie)`);
    }

    if (totalRequestedQuantity > availableStock) {
      throw new Error(
        `Niewystarczająca ilość produktu "${variant.product.name}". ` +
        `Dostępne: ${availableStock} szt., żądane: ${totalRequestedQuantity} szt.`
      );
    }

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // Create new item
      await prisma.cartItem.create({
        data: {
          cartId,
          variantId,
          quantity,
        },
      });
    }

    // Return updated cart
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });

    return await this.formatCart(cart!);
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<CartWithItems> {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      await prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      // Get the cart item with variant and inventory
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: {
          variant: {
            include: {
              inventory: true,
              product: { select: { name: true } }
            }
          }
        }
      });

      if (!cartItem) {
        throw new Error('Produkt nie został znaleziony w koszyku');
      }

      // Calculate available stock
      const availableStock = cartItem.variant.inventory.reduce(
        (sum, inv) => sum + (inv.quantity - inv.reserved),
        0
      );

      if (quantity > availableStock) {
        throw new Error(
          `Niewystarczająca ilość produktu "${cartItem.variant.product.name}". ` +
          `Dostępne: ${availableStock} szt., żądane: ${quantity} szt.`
        );
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });

    return await this.formatCart(cart!);
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string): Promise<CartWithItems> {
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });

    return await this.formatCart(cart!);
  }

  /**
   * Clear all items from cart and reset coupon
   */
  async clearCart(cartId: string): Promise<CartWithItems> {
    // Delete all items from cart
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    // Also clear the coupon - it should not persist after order/clear
    await prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: null },
    });

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });

    return await this.formatCart(cart!);
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(cartId: string, couponCode: string): Promise<CartWithItems> {
    // Validate coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon) {
      throw new Error('Nieprawidłowy kod kuponu');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new Error('Kupon wygasł');
    }

    if (coupon.maximumUses && coupon.usedCount >= coupon.maximumUses) {
      throw new Error('Kupon został wykorzystany maksymalną liczbę razy');
    }

    await prisma.cart.update({
      where: { id: cartId },
      data: { couponCode },
    });

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });

    return await this.formatCart(cart!);
  }

  /**
   * Remove coupon from cart
   */
  async removeCoupon(cartId: string): Promise<CartWithItems> {
    await prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: null },
    });

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: this.cartInclude,
    });

    return await this.formatCart(cart!);
  }

  /**
   * Merge guest cart into user cart after login
   */
  async mergeCarts(userId: string, sessionId: string): Promise<CartWithItems> {
    const [userCart, guestCart] = await Promise.all([
      prisma.cart.findUnique({
        where: { userId },
        include: this.cartInclude,
      }),
      prisma.cart.findUnique({
        where: { sessionId },
        include: this.cartInclude,
      }),
    ]);

    if (!guestCart) {
      // No guest cart to merge
      if (userCart) {
        return await this.formatCart(userCart);
      }
      return this.getOrCreateCart(userId);
    }

    if (!userCart) {
      // Convert guest cart to user cart
      const updatedCart = await prisma.cart.update({
        where: { id: guestCart.id },
        data: {
          userId,
          sessionId: null,
          expiresAt: null,
        },
        include: this.cartInclude,
      });
      return await this.formatCart(updatedCart);
    }

    // Merge items from guest cart to user cart
    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items.find(
        (item) => item.variantId === guestItem.variantId
      );

      if (existingItem) {
        // Add quantities
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + guestItem.quantity },
        });
      } else {
        // Move item to user cart
        await prisma.cartItem.update({
          where: { id: guestItem.id },
          data: { cartId: userCart.id },
        });
      }
    }

    // Copy coupon from guest cart if user cart doesn't have one
    if (guestCart.couponCode && !userCart.couponCode) {
      await prisma.cart.update({
        where: { id: userCart.id },
        data: { couponCode: guestCart.couponCode },
      });
    }

    // Delete empty guest cart
    await prisma.cart.delete({
      where: { id: guestCart.id },
    });

    const mergedCart = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: this.cartInclude,
    });

    return await this.formatCart(mergedCart!);
  }

  /**
   * Include relations for cart queries
   */
  private cartInclude = {
    items: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                tags: true,
                images: {
                  orderBy: { order: 'asc' as const },
                  take: 1,
                },
              },
            },
            inventory: true,
          },
        },
      },
    },
  };

  /**
   * Get wholesaler from product tags
   */
  private getWholesaler(tags: string[]): string | null {
    const WHOLESALER_PATTERN = /^(hurtownia[:\-_](.+)|Ikonka|BTP|HP|Gastro|Horeca|Hurtownia\s+Przemysłowa|Leker|Forcetop)$/i;
    for (const tag of tags) {
      const match = tag.match(WHOLESALER_PATTERN);
      if (match) {
        // Return the captured group if present (e.g., "HP" from "hurtownia:HP"), or the whole match
        return match[2] || match[1];
      }
    }
    return null;
  }

  /**
   * Format cart with calculated totals
   */
  private async formatCart(cart: any): Promise<CartWithItems> {
    const items: CartItemWithProduct[] = cart.items.map((item: any) => {
      // Use variant price, but fallback to product price if variant price is 0
      const variantPrice = Number(item.variant.price);
      const productPrice = Number(item.variant.product.price || 0);
      const effectivePrice = variantPrice > 0 ? variantPrice : productPrice;
      const tags = item.variant.product.tags || [];
      const wholesaler = this.getWholesaler(tags);
      
      return {
        id: item.id,
        quantity: item.quantity,
        variant: {
          id: item.variant.id,
          name: item.variant.name,
          sku: item.variant.sku,
          price: effectivePrice,
          compareAtPrice: item.variant.compareAtPrice
            ? Number(item.variant.compareAtPrice)
            : null,
          attributes: item.variant.attributes,
          product: {
            id: item.variant.product.id,
            name: item.variant.product.name,
            slug: item.variant.product.slug,
            images: item.variant.product.images,
            tags: tags,
            wholesaler: wholesaler,
          },
          inventory: item.variant.inventory.map((inv: any) => ({
            quantity: inv.quantity,
            reserved: inv.reserved,
          })),
        },
      };
    });

    const subtotal = roundMoney(items.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    ));

    // Calculate discount based on coupon
    let discount = 0;
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      });
      
      if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        if (coupon.type === 'PERCENTAGE') {
          // Percentage discount
          discount = roundMoney(subtotal * Number(coupon.value) / 100);
        } else if (coupon.type === 'FIXED_AMOUNT') {
          // Fixed amount discount
          discount = roundMoney(Math.min(Number(coupon.value), subtotal));
        }
      }
    }

    const total = roundMoney(subtotal - discount);

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      couponCode: cart.couponCode,
      items,
      subtotal,
      discount,
      total,
    };
  }
}

export const cartService = new CartService();
