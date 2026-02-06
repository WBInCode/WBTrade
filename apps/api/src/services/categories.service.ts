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

// Tagi wymagające "produkt w paczce"
const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];

// Tagi "produkt w paczce" - różne rozmiary paczek
const PACKAGE_TAGS = [
  'produkt w paczce: 1',
  'produkt w paczce: 2',
  'produkt w paczce: 3',
  'produkt w paczce: 4',
  'produkt w paczce: 5',
];

// UKRYWANIE PRODUKTÓW LEKER:
// Domeny obrazków które blokują hotlinking - produkty z tymi obrazkami są ukryte
const BLOCKED_IMAGE_DOMAINS = ['b2b.leker.pl'];
// Tagi które ukrywają produkty całkowicie
const HIDDEN_TAGS = ['błąd zdjęcia', 'błąd zdjęcia '];

// Bazowy filtr dla widocznych produktów - MUSI BYĆ IDENTYCZNY jak w products.service.ts
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
  // Produkty MUSZĄ spełniać wszystkie warunki (AND)
  AND: [
    // Tag dostawy - nie pokazuj produktów z tylko tagiem hurtowni
    { tags: { hasSome: DELIVERY_TAGS } },
    // Kategoria z Baselinker - musi być przypisana
    { 
      category: { 
        baselinkerCategoryId: { not: null } 
      } 
    },
    // Jeśli ma "Paczkomaty i Kurier", musi mieć też "produkt w paczce"
    {
      OR: [
        { NOT: { tags: { hasSome: PACZKOMAT_TAGS } } },
        { tags: { hasSome: PACKAGE_TAGS } },
      ]
    },
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
   * Get all category IDs that have baselinkerCategoryId (valid Baselinker categories)
   */
  private async getBaselinkerCategoryIds(): Promise<Set<string>> {
    const categories = await prisma.category.findMany({
      where: { 
        baselinkerCategoryId: { not: null },
        isActive: true,
      },
      select: { id: true },
    });
    return new Set(categories.map(c => c.id));
  }

  /**
   * Count visible products for a category (using same filters as products listing)
   * Filtr SQL już uwzględnia warunek "produkt w paczce" przez VISIBLE_PRODUCT_WHERE
   */
  private async countVisibleProducts(categoryId: string): Promise<number> {
    // First check if this category has baselinkerCategoryId
    const validCategoryIds = await this.getBaselinkerCategoryIds();
    if (!validCategoryIds.has(categoryId)) {
      return 0;
    }

    return prisma.product.count({
      where: {
        ...VISIBLE_PRODUCT_WHERE,
        categoryId,
      },
    });
  }

  /**
   * Count visible products for multiple categories at once
   * Filtr SQL już uwzględnia warunek "produkt w paczce" przez VISIBLE_PRODUCT_WHERE
   * Dodatkowo filtruje produkty z zablokowanymi domenami obrazków (Leker)
   */
  private async countVisibleProductsForCategories(categoryIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    
    // Only count products in categories that have baselinkerCategoryId
    const validCategoryIds = await this.getBaselinkerCategoryIds();
    const filteredCategoryIds = categoryIds.filter(id => validCategoryIds.has(id));
    
    if (filteredCategoryIds.length === 0) {
      return counts;
    }
    
    // Pobierz produkty z obrazkami żeby móc odfiltrować te z zablokowanych domen (Leker)
    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: filteredCategoryIds },
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
        tags: { hasSome: DELIVERY_TAGS },
        // Nie pokazuj produktów z tagiem "błąd zdjęcia"
        NOT: {
          tags: { hasSome: HIDDEN_TAGS }
        },
        // Jeśli ma "Paczkomaty i Kurier", musi mieć też "produkt w paczce"
        OR: [
          { NOT: { tags: { hasSome: PACZKOMAT_TAGS } } },
          { tags: { hasSome: PACKAGE_TAGS } },
        ],
      },
      select: {
        id: true,
        categoryId: true,
        images: {
          select: { url: true },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    });
    
    // Filtruj produkty z zablokowanych domen obrazków (Leker b2b.leker.pl)
    const visibleProducts = products.filter(product => {
      const imageUrl = product.images[0]?.url;
      if (!imageUrl) return true; // Brak obrazka = produkt widoczny
      
      // Sprawdź czy obrazek jest z zablokowanej domeny
      const hasBlockedImage = BLOCKED_IMAGE_DOMAINS.some(domain => 
        imageUrl.includes(domain)
      );
      return !hasBlockedImage;
    });
    
    // Zlicz produkty per kategoria
    for (const product of visibleProducts) {
      if (product.categoryId) {
        counts.set(product.categoryId, (counts.get(product.categoryId) || 0) + 1);
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
   * Now returns only categories from Baselinker (with baselinkerCategoryId)
   * Structure: main categories (parentId = null) with their subcategories
   */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    // Get main categories from Baselinker (parentId = null, has baselinkerCategoryId)
    const mainCategories = await prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null,
        baselinkerCategoryId: { not: null }, // Only Baselinker categories
      },
      orderBy: { name: 'asc' },
      include: {
        children: {
          where: { 
            isActive: true,
            baselinkerCategoryId: { not: null }, // Only Baselinker subcategories
          },
          orderBy: { name: 'asc' },
          include: {
            children: {
              where: { 
                isActive: true,
                baselinkerCategoryId: { not: null },
              },
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

    // Filter out categories with 0 products (optional - uncomment if needed)
    // const filterEmptyCategories = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
    //   return cats
    //     .filter(cat => (cat.productCount || 0) > 0)
    //     .map(cat => ({
    //       ...cat,
    //       children: cat.children ? filterEmptyCategories(cat.children) : []
    //     }));
    // };
    // return filterEmptyCategories(rootCategories);

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
   * Filters by baselinkerCategoryId to return only Baselinker categories
   */
  async getMainCategories(): Promise<CategoryWithChildren[]> {
    const categories = await prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null,
        baselinkerCategoryId: { not: null } // Only Baselinker categories
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { 
            isActive: true,
            baselinkerCategoryId: { not: null }
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          include: {
            children: {
              where: { 
                isActive: true,
                baselinkerCategoryId: { not: null }
              },
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
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
