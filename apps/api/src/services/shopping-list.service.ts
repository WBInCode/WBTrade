import { prisma } from '../db';

export interface ShoppingListWithItems {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
  items: ShoppingListItemWithProduct[];
}

export interface ShoppingListItemWithProduct {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  note: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    images: { url: string; alt: string | null }[];
    status: string;
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
  } | null;
}

export class ShoppingListService {
  /**
   * Get all shopping lists for a user (without items detail)
   */
  async getUserLists(userId: string): Promise<ShoppingListWithItems[]> {
    const lists = await prisma.shoppingList.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        items: {
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
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return lists.map((list: any) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      itemCount: list._count.items,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: list.items.map((item: any) => this.mapItem(item)),
    }));
  }

  /**
   * Get a single shopping list with all items
   */
  async getList(userId: string, listId: string): Promise<ShoppingListWithItems> {
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
      include: {
        items: {
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
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!list) {
      throw new Error('Lista nie została znaleziona');
    }

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      itemCount: list._count.items,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: list.items.map((item: any) => this.mapItem(item)),
    };
  }

  /**
   * Create a new shopping list
   */
  async createList(
    userId: string,
    name: string,
    description?: string
  ): Promise<ShoppingListWithItems> {
    const list = await prisma.shoppingList.create({
      data: {
        userId,
        name,
        description: description || null,
      },
      include: {
        items: true,
        _count: { select: { items: true } },
      },
    });

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      itemCount: 0,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: [],
    };
  }

  /**
   * Update a shopping list name/description
   */
  async updateList(
    userId: string,
    listId: string,
    data: { name?: string; description?: string }
  ): Promise<ShoppingListWithItems> {
    // Verify ownership
    const existing = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!existing) {
      throw new Error('Lista nie została znaleziona');
    }

    await prisma.shoppingList.update({
      where: { id: listId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
    });

    return this.getList(userId, listId);
  }

  /**
   * Delete a shopping list
   */
  async deleteList(userId: string, listId: string): Promise<void> {
    const existing = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!existing) {
      throw new Error('Lista nie została znaleziona');
    }

    await prisma.shoppingList.delete({
      where: { id: listId },
    });
  }

  /**
   * Add a product to a shopping list
   */
  async addItem(
    userId: string,
    listId: string,
    productId: string,
    variantId?: string,
    quantity?: number,
    note?: string
  ): Promise<ShoppingListItemWithProduct> {
    // Verify list ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new Error('Lista nie została znaleziona');
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Produkt nie został znaleziony');
    }

    // Check if already in list
    const existing = await prisma.shoppingListItem.findUnique({
      where: {
        listId_productId: { listId, productId },
      },
    });

    if (existing) {
      // Update quantity instead
      const updated = await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: {
          quantity: quantity || existing.quantity,
          note: note !== undefined ? note : existing.note,
        },
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

      // Touch the list updatedAt
      await prisma.shoppingList.update({
        where: { id: listId },
        data: { updatedAt: new Date() },
      });

      return this.mapItem(updated);
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        listId,
        productId,
        variantId: variantId || null,
        quantity: quantity || 1,
        note: note || null,
      },
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

    // Touch the list updatedAt
    await prisma.shoppingList.update({
      where: { id: listId },
      data: { updatedAt: new Date() },
    });

    return this.mapItem(item);
  }

  /**
   * Remove an item from a shopping list
   */
  async removeItem(userId: string, listId: string, itemId: string): Promise<void> {
    // Verify list ownership
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new Error('Lista nie została znaleziona');
    }

    await prisma.shoppingListItem.delete({
      where: { id: itemId },
    });

    // Touch the list updatedAt
    await prisma.shoppingList.update({
      where: { id: listId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Get user's lists that contain a specific product (for UI check)
   */
  async getListsContainingProduct(
    userId: string,
    productId: string
  ): Promise<{ listId: string; listName: string }[]> {
    const items = await prisma.shoppingListItem.findMany({
      where: {
        productId,
        list: { userId },
      },
      include: {
        list: {
          select: { id: true, name: true },
        },
      },
    });

    return items.map((item: any) => ({
      listId: item.list.id,
      listName: item.list.name,
    }));
  }

  private mapItem(item: any): ShoppingListItemWithProduct {
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      note: item.note,
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
        status: item.product.status,
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

export const shoppingListService = new ShoppingListService();
