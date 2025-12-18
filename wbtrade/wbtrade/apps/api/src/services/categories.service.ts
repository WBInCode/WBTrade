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
   */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
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
      } else {
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
   */
  async getMainCategories(): Promise<CategoryWithChildren[]> {
    const categories = await prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null 
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
}

export const categoriesService = new CategoriesService();
