import { prisma } from '../db';

// Tagi dostawy - produkty MUSZĄ mieć przynajmniej jeden z tych tagów żeby być widoczne
const DELIVERY_TAGS = [
  'Paczkomaty i Kurier',
  'paczkomaty i kurier',
  'Tylko kurier',
  'tylko kurier',
  'do 2 kg',
  'do 5 kg',
  'do 10 kg',
  'do 20 kg',
  'do 31,5 kg',
];

// Tagi głównych kategorii
const CATEGORY_TAGS = [
  'Elektronika',
  'Sport',
  'Zdrowie i uroda',
  'Dom i ogród',
  'Motoryzacja',
  'Dziecko',
  'Biurowe i papiernicze',
  'Gastronomiczne',
  'gastronomia',
  'Gastronomia',
];

// Bazowy filtr dla widocznych produktów (taki sam jak w products.service.ts)
const VISIBLE_PRODUCT_WHERE = {
  price: { gt: 0 },
  variants: {
    some: {
      inventory: {
        some: {
          quantity: { gt: 0 }
        }
      }
    }
  },
  AND: [
    { tags: { hasSome: DELIVERY_TAGS } },
    { tags: { hasSome: CATEGORY_TAGS } },
  ],
};

export interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image: string | null;
  order: number;
  isActive: boolean;
  children?: CategoryWithChildren[];
  productCount?: number;
}

export class CategoriesService {
  /**
   * Count visible products for a category (using same filters as products listing)
   */
  private async countVisibleProducts(categoryId: string): Promise<number> {
    return prisma.product.count({
      where: {
        ...VISIBLE_PRODUCT_WHERE,
        categoryId,
      },
    });
  }

  /**
   * Count visible products for multiple categories at once
   */
  private async countVisibleProductsForCategories(categoryIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    
    // Use raw query for better performance
    const results = await prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        ...VISIBLE_PRODUCT_WHERE,
        categoryId: { in: categoryIds },
      },
      _count: { id: true },
    });
    
    for (const result of results) {
      if (result.categoryId) {
        counts.set(result.categoryId, result._count.id);
      }
    }
    
    return counts;
  }

  /**
   * Calculate total product count including all descendants
   */
  private calculateTotalProductCount(category: CategoryWithChildren): number {
    let total = category.productCount || 0;
    if (category.children) {
      for (const child of category.children) {
        total += this.calculateTotalProductCount(child);
      }
    }
    return total;
  }

  /**
   * Get all categories in a tree structure
   * Filters only main categories (order > 0) and their children (all levels)
   */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    // First get main categories (order > 0)
    const mainCategoryIds = await prisma.category.findMany({
      where: { isActive: true, parentId: null, order: { gt: 0 } },
      select: { id: true }
    });
    const mainIds = mainCategoryIds.map(c => c.id);

    // Get main categories with their full hierarchy (3 levels)
    const mainCategories = await prisma.category.findMany({
      where: { 
        isActive: true,
        id: { in: mainIds }
      },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            }
          }
        }
      }
    });

    // Collect all category IDs to count products
    const allCategoryIds: string[] = [];
    const collectIds = (cats: any[]) => {
      for (const cat of cats) {
        allCategoryIds.push(cat.id);
        if (cat.children) collectIds(cat.children);
      }
    };
    collectIds(mainCategories);

    // Get visible product counts for all categories at once
    const productCounts = await this.countVisibleProductsForCategories(allCategoryIds);

    // Transform to CategoryWithChildren format with correct counts
    const transformCategory = (cat: any): CategoryWithChildren => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      image: cat.image,
      order: cat.order,
      isActive: cat.isActive,
      productCount: productCounts.get(cat.id) || 0,
      children: cat.children ? cat.children.map(transformCategory) : []
    });

    const rootCategories = mainCategories.map(transformCategory);

    // Calculate total product counts including descendants
    const updateProductCounts = (categories: CategoryWithChildren[]) => {
      for (const cat of categories) {
        if (cat.children && cat.children.length > 0) {
          updateProductCounts(cat.children);
          // Add children's products to parent count
          cat.productCount = (cat.productCount || 0) + cat.children.reduce(
            (sum, child) => sum + (child.productCount || 0), 0
          );
        }
      }
    };
    updateProductCounts(rootCategories);

    return rootCategories;
  }

  /**
   * Get category by slug with children
   */
  async getCategoryBySlug(slug: string): Promise<CategoryWithChildren | null> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            }
          }
        },
        parent: true,
      }
    });

    if (!category) return null;

    // Collect all category IDs to count products
    const allCategoryIds: string[] = [category.id];
    for (const child of category.children) {
      allCategoryIds.push(child.id);
      for (const grandchild of child.children) {
        allCategoryIds.push(grandchild.id);
      }
    }

    // Get visible product counts for all categories at once
    const productCounts = await this.countVisibleProductsForCategories(allCategoryIds);

    // Helper to calculate total products including grandchildren
    const calcChildProductCount = (child: typeof category.children[0]): number => {
      let total = productCounts.get(child.id) || 0;
      if (child.children) {
        for (const grandchild of child.children) {
          total += productCounts.get(grandchild.id) || 0;
        }
      }
      return total;
    };

    // Calculate total for all descendants
    let totalProductCount = productCounts.get(category.id) || 0;
    for (const child of category.children) {
      totalProductCount += calcChildProductCount(child);
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      image: category.image,
      order: category.order,
      isActive: category.isActive,
      productCount: totalProductCount,
      children: category.children.map(child => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentId: child.parentId,
        image: child.image,
        order: child.order,
        isActive: child.isActive,
        productCount: calcChildProductCount(child),
        children: child.children.map(grandchild => ({
          id: grandchild.id,
          name: grandchild.name,
          slug: grandchild.slug,
          parentId: grandchild.parentId,
          image: grandchild.image,
          order: grandchild.order,
          isActive: grandchild.isActive,
          productCount: productCounts.get(grandchild.id) || 0,
        }))
      }))
    };
  }

  /**
   * Get category path (breadcrumb)
   */
  async getCategoryPath(slug: string): Promise<{ id: string; name: string; slug: string }[]> {
    const path: { id: string; name: string; slug: string }[] = [];
    
    let current = await prisma.category.findUnique({
      where: { slug },
      include: { parent: true }
    });

    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
      });
      
      if (current.parent) {
        current = await prisma.category.findUnique({
          where: { id: current.parentId! },
          include: { parent: true }
        });
      } else {
        current = null;
      }
    }

    return path;
  }

  /**
   * Get main (root) categories only
   * Filters by order > 0 to exclude old BaseLinker categories
   */
  async getMainCategories(): Promise<CategoryWithChildren[]> {
    const categories = await prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null,
        order: { gt: 0 } // Only unified main categories have order > 0
      },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            }
          }
        }
      }
    });

    // Collect all category IDs to count products
    const allCategoryIds: string[] = [];
    const collectIds = (cats: any[]) => {
      for (const cat of cats) {
        allCategoryIds.push(cat.id);
        if (cat.children) collectIds(cat.children);
      }
    };
    collectIds(categories);

    // Get visible product counts for all categories at once
    const productCounts = await this.countVisibleProductsForCategories(allCategoryIds);

    // Transform and calculate total product counts
    const transformCategory = (cat: any, parentId: string | null = null): CategoryWithChildren => {
      const children = cat.children ? cat.children.map((child: any) => transformCategory(child, cat.id)) : [];
      const directCount = productCounts.get(cat.id) || 0;
      const childrenCount = children.reduce((sum: number, child: CategoryWithChildren) => sum + (child.productCount || 0), 0);
      
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: parentId,
        image: cat.image || null,
        order: cat.order || 0,
        isActive: cat.isActive ?? true,
        productCount: directCount + childrenCount,
        children: children.length > 0 ? children : undefined
      };
    };

    return categories.map(cat => transformCategory(cat, null));
  }

  /**
   * Get all categories (flat list for admin)
   */
  async getAllCategoriesFlat() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: { where: { price: { gt: 0 } } }, children: true }
        }
      }
    });
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    slug: string;
    description?: string | null;
    image?: string | null;
    parentId?: string | null;
  }) {
    // Check if slug already exists
    const existingSlug = await prisma.category.findUnique({
      where: { slug: data.slug }
    });

    if (existingSlug) {
      throw new Error('Kategoria z tym slugiem już istnieje');
    }

    // Get the max order to add at the end
    const maxOrder = await prisma.category.aggregate({
      _max: { order: true }
    });

    return prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        image: data.image || null,
        parentId: data.parentId || null,
        order: (maxOrder._max.order || 0) + 1,
        isActive: true,
      },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    });
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, data: {
    name?: string;
    slug?: string;
    description?: string | null;
    image?: string | null;
    parentId?: string | null;
  }) {
    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error('Kategoria nie została znaleziona');
    }

    // Check if new slug conflicts with another category
    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await prisma.category.findUnique({
        where: { slug: data.slug }
      });
      if (slugConflict) {
        throw new Error('Kategoria z tym slugiem już istnieje');
      }
    }

    // Prevent setting parent to self or creating circular reference
    if (data.parentId === id) {
      throw new Error('Kategoria nie może być swoim własnym rodzicem');
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        image: data.image,
        parentId: data.parentId,
      },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    });
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string) {
    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    });

    if (!existing) {
      throw new Error('Kategoria nie została znaleziona');
    }

    // Set products in this category to have no category
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });

    // Move children to parent of deleted category (or make them root)
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: existing.parentId }
    });

    // Delete the category
    return prisma.category.delete({
      where: { id }
    });
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true }
        },
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });
  }
}

export const categoriesService = new CategoriesService();
