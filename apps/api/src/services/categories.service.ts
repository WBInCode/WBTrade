import { prisma } from '../db';

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
   * Filters only main categories (order > 0) and their children
   */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    // First get main categories (order > 0)
    const mainCategoryIds = await prisma.category.findMany({
      where: { isActive: true, parentId: null, order: { gt: 0 } },
      select: { id: true }
    });
    const mainIds = mainCategoryIds.map(c => c.id);

    // Get main categories and their children
    const allCategories = await prisma.category.findMany({
      where: { 
        isActive: true,
        OR: [
          { id: { in: mainIds } },
          { parentId: { in: mainIds } }
        ]
      },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create all category objects
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        image: cat.image,
        order: cat.order,
        isActive: cat.isActive,
        children: [],
        productCount: cat._count.products,
      });
    });

    // Second pass: build tree
    categoryMap.forEach(cat => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(cat);
        }
      } else if (cat.order > 0) {
        // Only add root categories with order > 0 (main unified categories)
        rootCategories.push(cat);
      }
    });

    // Third pass: calculate total product counts including descendants
    const updateProductCounts = (categories: CategoryWithChildren[]) => {
      for (const cat of categories) {
        if (cat.children && cat.children.length > 0) {
          updateProductCounts(cat.children);
        }
        cat.productCount = this.calculateTotalProductCount(cat);
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
            _count: {
              select: { products: true }
            },
            children: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
              include: {
                _count: {
                  select: { products: true }
                }
              }
            }
          }
        },
        parent: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) return null;

    // Helper to calculate total products including grandchildren
    const calcChildProductCount = (child: typeof category.children[0]): number => {
      let total = child._count.products;
      if (child.children) {
        for (const grandchild of child.children) {
          total += grandchild._count.products;
        }
      }
      return total;
    };

    // Calculate total for all descendants
    let totalProductCount = category._count.products;
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
          productCount: grandchild._count.products,
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
        _count: {
          select: { products: true }
        },
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      image: cat.image,
      order: cat.order,
      isActive: cat.isActive,
      productCount: cat._count.products,
      children: cat.children.map(child => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentId: cat.id,
        image: null,
        order: 0,
        isActive: true,
      }))
    }));
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
          select: { products: true, children: true }
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
