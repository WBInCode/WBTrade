import { prisma } from '../db';
import { Prisma, PriceChangeSource } from '@prisma/client';
import { getProductsIndex } from '../lib/meilisearch';
import { MeiliProduct } from './search.service';
import { queueProductIndex, queueProductDelete } from '../lib/queue';
import { priceHistoryService } from './price-history.service';

// Tagi dostawy - produkty MUSZĄ mieć przynajmniej jeden z tych tagów żeby być widoczne
// Produkty z TYLKO tagiem hurtowni (Ikonka, BTP, HP, Leker) nie będą wyświetlane
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

// Tagi "Paczkomaty i Kurier" - produkty z tymi tagami MUSZĄ mieć też tag "produkt w paczce"
const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];

// Tagi "produkt w paczce" - różne rozmiary paczek
const PACKAGE_TAGS = [
  'produkt w paczce: 1',
  'produkt w paczce: 2',
  'produkt w paczce: 3',
  'produkt w paczce: 4',
  'produkt w paczce: 5',
];

// Tagi ukrywające produkty - produkty z tymi tagami NIE będą wyświetlane
const HIDDEN_TAGS = ['błąd zdjęcia', 'błąd zdjęcia '];

// Filtr SQL dla warunku "produkt w paczce" oraz ukrywania produktów z błędami
// Jeśli produkt ma "Paczkomaty i Kurier" to MUSI mieć też "produkt w paczce"
// Produkty z tagiem "błąd zdjęcia" są ukrywane
const PACKAGE_FILTER_WHERE: Prisma.ProductWhereInput = {
  AND: [
    // Nie pokazuj produktów z tagami błędów
    { NOT: { tags: { hasSome: HIDDEN_TAGS } } },
    // Warunek paczkomatu
    {
      OR: [
        { NOT: { tags: { hasSome: PACZKOMAT_TAGS } } },
        { tags: { hasSome: PACKAGE_TAGS } },
      ]
    }
  ]
};

// Kategorie są teraz zarządzane przez Baselinker, nie przez tagi
// Produkty muszą mieć categoryId ustawione przez synchronizację z Baselinker

interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sku?: string; // Direct SKU search
  sort?: string;
  status?: string;
  hideOldZeroStock?: boolean; // Ukryj produkty ze stanem 0 starsze niż 14 dni
  sessionSeed?: number; // Seed for consistent random sorting
}

interface ProductsListResult {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Safely parse JSON fields that might already be objects or strings
 */
function parseJsonField(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Transform product to ensure JSON fields are properly parsed
 */
function transformProduct(product: any): any {
  if (!product) return product;
  
  // Transform variants with stock calculated from inventory
  const transformedVariants = product.variants?.map((variant: any) => ({
    ...variant,
    attributes: parseJsonField(variant.attributes) || {},
    // Calculate stock from inventory if available
    stock: variant.inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity - inv.reserved), 0) ?? 0,
  }));
  
  // Calculate total stock as sum of all variant stocks
  const totalStock = transformedVariants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) ?? 0;
  
  return {
    ...product,
    specifications: parseJsonField(product.specifications),
    variants: transformedVariants,
    // Add total stock at product level for easy access
    stock: totalStock,
    // Ensure tags are always an array
    tags: product.tags || [],
  };
}

/**
 * Transform an array of products
 */
function transformProducts(products: any[]): any[] {
  return products.map(transformProduct);
}

/**
 * Filter out products with zero stock that haven't been updated in specified days
 * Only hides products that have 0 stock AND haven't had inventory updates recently
 */
function filterOldZeroStockProducts(products: any[], days: number = 14): any[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return products.filter(product => {
    // If product has stock > 0, always keep it
    if (product.stock > 0) return true;
    
    // Product has 0 stock - check if it was recently updated
    // Use updatedAt instead of createdAt to check for recent inventory changes
    const updatedAt = new Date(product.updatedAt);
    if (updatedAt > cutoffDate) return true;
    
    // Also check variants for recent updates (inventory syncs update variants)
    if (product.variants && product.variants.length > 0) {
      const hasRecentVariantUpdate = product.variants.some((variant: any) => {
        const variantUpdated = new Date(variant.updatedAt);
        return variantUpdated > cutoffDate;
      });
      if (hasRecentVariantUpdate) return true;
    }
    
    // Product has 0 stock and hasn't been updated in X days - hide it
    return false;
  });
}

/**
 * Filter products: if product has "Paczkomaty i Kurier" tag, it MUST also have "produkt w paczce" tag
 * Products without proper package info should not be displayed
 */
function filterProductsWithPackageInfo(products: any[]): any[] {
  const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];
  const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce|produkty?\s*w\s*paczce/i;
  
  return products.filter(product => {
    const tags = product.tags || [];
    
    // Check if product has paczkomat tag
    const hasPaczkomatTag = tags.some((tag: string) => 
      PACZKOMAT_TAGS.some(pt => tag.toLowerCase() === pt.toLowerCase())
    );
    
    // If no paczkomat tag, product is OK (might have "Tylko kurier" or weight tags)
    if (!hasPaczkomatTag) return true;
    
    // Product has paczkomat tag - must also have "produkt w paczce" tag
    const hasPackageLimitTag = tags.some((tag: string) => 
      PACKAGE_LIMIT_PATTERN.test(tag)
    );
    
    return hasPackageLimitTag;
  });
}

export class ProductsService {
  /**
   * Check if a category exists by ID
   */
  async categoryExists(categoryId: string): Promise<boolean> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    return !!category;
  }

  /**
   * Get all descendant category IDs for a given category slug or ID (including the category itself)
   */
  private async getAllCategoryIds(categorySlugOrId: string): Promise<string[]> {
    // Try to find the category by exact slug first
    let categories = await prisma.category.findMany({
      where: { slug: categorySlugOrId },
      select: { id: true },
    });

    // If not found by exact slug, try with common prefixes from all suppliers
    if (categories.length === 0) {
      const prefixes = ['btp-', 'hp-', 'leker-', 'ikonka-'];
      
      // Find ALL matching categories from all suppliers
      categories = await prisma.category.findMany({
        where: { 
          OR: [
            ...prefixes.map(prefix => ({
              slug: {
                startsWith: `${prefix}${categorySlugOrId}`
              }
            })),
            // Also match if slug contains the search term (removes numeric IDs)
            {
              slug: {
                contains: categorySlugOrId,
                mode: 'insensitive' as const
              }
            }
          ]
        },
        select: { id: true },
      });
    }

    // If not found by slug patterns, try by ID
    if (categories.length === 0) {
      const categoryById = await prisma.category.findUnique({
        where: { id: categorySlugOrId },
        select: { id: true },
      });
      if (categoryById) {
        categories = [categoryById];
      }
    }

    if (categories.length === 0) {
      return [];
    }

    const categoryIds: string[] = categories.map(c => c.id);

    // Recursively get all descendant categories for each found category
    const getDescendants = async (parentIds: string[]): Promise<void> => {
      const children = await prisma.category.findMany({
        where: {
          parentId: { in: parentIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (children.length > 0) {
        const childIds = children.map(c => c.id);
        categoryIds.push(...childIds);
        await getDescendants(childIds);
      }
    };

    await getDescendants(categoryIds);

    return categoryIds;
  }

  /**
   * Get all products with filters and pagination
   */
  async getAll(filters: ProductFilters = {}): Promise<ProductsListResult> {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      status,
      hideOldZeroStock = false,
      sessionSeed,
    } = filters;

    // If search is provided, use Meilisearch for better results
    // But also check if the search looks like a SKU (numeric or alphanumeric code)
    if (search && search.trim()) {
      // First try to find by exact SKU match
      const skuMatch = await prisma.product.findMany({
        where: {
          sku: { contains: search.trim(), mode: 'insensitive' },
          status: 'ACTIVE',
          price: { gt: 0 },
        },
        take: 10,
        include: {
          images: { orderBy: { order: 'asc' } },
          category: true,
          variants: { include: { inventory: true } },
        },
      });
      
      if (skuMatch.length > 0) {
        // Found by SKU - return these first, then search for more
        const meilisearchResults = await this.searchWithMeilisearch(filters);
        const skuIds = skuMatch.map(p => p.id);
        let combinedProducts = [
          ...transformProducts(skuMatch),
          ...meilisearchResults.products.filter(p => !skuIds.includes(p.id)),
        ];
        
        // Filter products: "Paczkomaty i Kurier" requires "produkt w paczce" tag
        combinedProducts = filterProductsWithPackageInfo(combinedProducts);
        combinedProducts = combinedProducts.slice(0, limit);
        
        return {
          ...meilisearchResults,
          products: combinedProducts,
        };
      }
      
      return this.searchWithMeilisearch(filters);
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      // Always filter out products with price <= 0
      price: { gt: 0 },
      // Produkty MUSZĄ mieć stan magazynowy > 0
      variants: {
        some: {
          inventory: {
            some: {
              quantity: { gt: 0 }
            }
          }
        }
      },
      // Produkty MUSZĄ mieć tag dostawy ORAZ kategorię z Baselinker
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
        PACKAGE_FILTER_WHERE,
      ],
    };
    
    // Only filter by status if explicitly provided
    if (status) {
      where.status = status as Prisma.EnumProductStatusFilter;
    }

    // If category is specified, get all subcategory IDs and filter by them
    if (category) {
      const categoryIds = await this.getAllCategoryIds(category);
      if (categoryIds.length > 0) {
        where.categoryId = { in: categoryIds };
      } else {
        // Category not found, return empty results
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    if (minPrice || maxPrice) {
      // Combine with existing price > 0 filter
      where.price = {
        gt: 0,
        ...(minPrice ? { gte: minPrice } : {}),
        ...(maxPrice ? { lte: maxPrice } : {}),
      };
    }

    // Build orderBy clause
    // Always add secondary sort by id for stable pagination (prevents random order when primary values are equal)
    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'asc' }];
    let useRandomSort = false;
    
    switch (sort) {
      case 'price_asc':
      case 'price-asc':
        orderBy = [{ price: 'asc' }, { id: 'asc' }];
        break;
      case 'price_desc':
      case 'price-desc':
        orderBy = [{ price: 'desc' }, { id: 'asc' }];
        break;
      case 'name_asc':
        orderBy = [{ name: 'asc' }, { id: 'asc' }];
        break;
      case 'name_desc':
        orderBy = [{ name: 'desc' }, { id: 'asc' }];
        break;
      case 'random':
      case 'relevance':
        // For random/relevance sort, we'll fetch more and shuffle with session seed
        // This ensures consistent ordering within a user session but different between sessions
        useRandomSort = true;
        orderBy = { id: 'asc' }; // Temporary, will be shuffled
        break;
      case 'popularity':
        // Sort by popularity score (salesCount*3 + viewCount*0.1)
        // Add secondary sort by id for stable pagination when scores are equal
        orderBy = [{ popularityScore: 'desc' }, { id: 'asc' }];
        break;
      case 'newest':
      default:
        orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];
    }

    // Execute queries in parallel
    // For random sort, we need to fetch more products and shuffle them
    const fetchLimit = useRandomSort ? 500 : limit;
    const fetchSkip = useRandomSort ? 0 : skip;
    
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: fetchSkip,
        take: fetchLimit,
        orderBy,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          category: true,
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transform products
    let transformedProducts = transformProducts(products);
    
    // Apply random shuffle if requested (seeded by session for consistency within a browsing session)
    if (useRandomSort && transformedProducts.length > 0) {
      // Use sessionSeed if provided (from frontend), otherwise fallback to daily seed
      const seed = sessionSeed || (() => {
        const today = new Date();
        return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      })();
      
      // Seeded shuffle function - produces same order for same seed
      const seededShuffle = (array: any[], seedValue: number) => {
        const shuffled = [...array];
        let currentSeed = seedValue;
        
        const random = () => {
          currentSeed = (currentSeed * 9301 + 49297) % 233280;
          return currentSeed / 233280;
        };
        
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      transformedProducts = seededShuffle(transformedProducts, seed);
      
      // Apply pagination after shuffle
      const startIndex = (page - 1) * limit;
      transformedProducts = transformedProducts.slice(startIndex, startIndex + limit);
    }
    
    // Filter out old zero-stock products if requested
    if (hideOldZeroStock) {
      transformedProducts = filterOldZeroStockProducts(transformedProducts, 14);
    }
    
    // Filter products: "Paczkomaty i Kurier" requires "produkt w paczce" tag
    transformedProducts = filterProductsWithPackageInfo(transformedProducts);

    return {
      products: transformedProducts,
      total: hideOldZeroStock ? transformedProducts.length : totalCount,
      page,
      limit,
      totalPages: Math.ceil((hideOldZeroStock ? transformedProducts.length : totalCount) / limit),
    };
  }

  /**
   * Search products using Meilisearch for better full-text search
   */
  private async searchWithMeilisearch(filters: ProductFilters): Promise<ProductsListResult> {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      status,
      hideOldZeroStock = false,
      sessionSeed,
    } = filters;

    try {
      const index = getProductsIndex();

      // Build filter array
      const meiliFilters: string[] = [];
      
      // Always filter out products with price <= 0
      meiliFilters.push('price > 0');
      
      // Produkty MUSZĄ mieć tag dostawy - nie pokazuj produktów z tylko tagiem hurtowni
      // Meilisearch używa składni: tags IN ["tag1", "tag2"] dla OR
      const deliveryTagsFilter = DELIVERY_TAGS.map(tag => `"${tag}"`).join(', ');
      meiliFilters.push(`tags IN [${deliveryTagsFilter}]`);
      
      // Produkty MUSZĄ mieć przypisaną kategorię z Baselinker
      // hasBaselinkerCategory jest indeksowany w Meilisearch jako filterable
      meiliFilters.push('hasBaselinkerCategory = true');
      
      // Only filter by status if explicitly provided
      if (status) {
        meiliFilters.push(`status = "${status}"`);
      }
      
      if (category) {
        const categoryIds = await this.getAllCategoryIds(category);
        if (categoryIds.length > 0) {
          meiliFilters.push(`categoryId IN [${categoryIds.map(id => `"${id}"`).join(', ')}]`);
        }
      }
      
      if (minPrice !== undefined) {
        meiliFilters.push(`price >= ${minPrice}`);
      }
      if (maxPrice !== undefined) {
        meiliFilters.push(`price <= ${maxPrice}`);
      }

      // Build sort
      // Always add secondary sort by id for stable pagination (prevents random order when primary values are equal)
      let meiliSort: string[] = [];
      switch (sort) {
        case 'price_asc':
        case 'price-asc':
          meiliSort = ['price:asc', 'id:asc'];
          break;
        case 'price_desc':
        case 'price-desc':
          meiliSort = ['price:desc', 'id:asc'];
          break;
        case 'name_asc':
          meiliSort = ['name:asc', 'id:asc'];
          break;
        case 'name_desc':
          meiliSort = ['name:desc', 'id:asc'];
          break;
        case 'popularity':
        case 'relevance':
          // Sort by popularityScore (salesCount*3 + viewCount*0.1)
          // Add secondary sort by id for stable pagination when scores are equal
          meiliSort = ['popularityScore:desc', 'id:asc'];
          break;
        case 'newest':
        default:
          meiliSort = ['createdAt:desc', 'id:asc'];
      }

      const results = await index.search<MeiliProduct>(search || '', {
        limit,
        offset: (page - 1) * limit,
        filter: meiliFilters.join(' AND '),
        sort: meiliSort,
        // Ensure we get accurate total count
        showMatchesPosition: false,
        attributesToRetrieve: ['id'], // Only need IDs for fetching from Prisma
      });

      // Get full product data from Prisma for the found IDs
      const productIds = results.hits.map((hit: MeiliProduct) => hit.id);
      
      if (productIds.length === 0) {
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          // Dodatkowy filtr: produkty muszą mieć stan > 0
          variants: {
            some: {
              inventory: {
                some: {
                  quantity: { gt: 0 }
                }
              }
            }
          },
          // Produkty MUSZĄ mieć tag dostawy ORAZ kategorię z Baselinker
          AND: [
            { tags: { hasSome: DELIVERY_TAGS } },
            { 
              category: { 
                baselinkerCategoryId: { not: null } 
              } 
            },
            // Jeśli ma "Paczkomaty i Kurier", musi mieć też "produkt w paczce"
            PACKAGE_FILTER_WHERE,
          ],
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          category: true,
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      });

      // Sort products to match Meilisearch order
      const sortedProducts = productIds.map((id: string) => 
        products.find(p => p.id === id)
      ).filter(Boolean);

      // Use estimatedTotalHits from MeiliSearch
      // Note: estimatedTotalHits is limited by maxTotalHits setting (default 10000)
      const total = results.estimatedTotalHits ?? results.hits.length;

      // Transform products
      let transformedProducts = transformProducts(sortedProducts as any[]);
      
      // Filter out old zero-stock products if requested
      if (hideOldZeroStock) {
        transformedProducts = filterOldZeroStockProducts(transformedProducts, 14);
      }
      
      // Filter products: "Paczkomaty i Kurier" requires "produkt w paczce" tag
      transformedProducts = filterProductsWithPackageInfo(transformedProducts);

      return {
        products: transformedProducts,
        total: hideOldZeroStock ? transformedProducts.length : total,
        page,
        limit,
        totalPages: Math.ceil((hideOldZeroStock ? transformedProducts.length : total) / limit),
      };
    } catch (error) {
      console.error('Meilisearch search error, falling back to Prisma:', error);
      // Fallback to Prisma search
      return this.searchWithPrismaFallback(filters);
    }
  }

  /**
   * Fallback search using Prisma when Meilisearch is unavailable
   */
  private async searchWithPrismaFallback(filters: ProductFilters): Promise<ProductsListResult> {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      status,
      hideOldZeroStock = false,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      // Produkty MUSZĄ mieć cenę > 0
      price: { gt: 0 },
      // Produkty MUSZĄ mieć stan magazynowy > 0
      variants: {
        some: {
          inventory: {
            some: {
              quantity: { gt: 0 }
            }
          }
        }
      },
      // Produkty MUSZĄ mieć tag dostawy ORAZ kategorię z Baselinker
      AND: [
        { tags: { hasSome: DELIVERY_TAGS } },
        { 
          category: { 
            baselinkerCategoryId: { not: null } 
          } 
        },
        // Jeśli ma "Paczkomaty i Kurier", musi mieć też "produkt w paczce"
        PACKAGE_FILTER_WHERE,
      ],
    };
    
    // Only filter by status if explicitly provided
    if (status) {
      where.status = status as Prisma.EnumProductStatusFilter;
    }

    if (category) {
      const categoryIds = await this.getAllCategoryIds(category);
      if (categoryIds.length > 0) {
        where.categoryId = { in: categoryIds };
      }
    }

    if (minPrice || maxPrice) {
      // Note: Admin view can see products with price 0
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'asc' }];
    switch (sort) {
      case 'price_asc':
        orderBy = [{ price: 'asc' }, { id: 'asc' }];
        break;
      case 'price_desc':
        orderBy = [{ price: 'desc' }, { id: 'asc' }];
        break;
      case 'name_asc':
        orderBy = [{ name: 'asc' }, { id: 'asc' }];
        break;
      case 'name_desc':
        orderBy = [{ name: 'desc' }, { id: 'asc' }];
        break;
      case 'popularity':
      case 'relevance':
        orderBy = [{ popularityScore: 'desc' }, { id: 'asc' }];
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { orderBy: { order: 'asc' } },
          category: true,
          variants: { include: { inventory: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transform products
    let transformedProducts = transformProducts(products);
    
    // Filter out old zero-stock products if requested
    if (hideOldZeroStock) {
      transformedProducts = filterOldZeroStockProducts(transformedProducts, 14);
    }
    
    // Filter products: "Paczkomaty i Kurier" requires "produkt w paczce" tag
    transformedProducts = filterProductsWithPackageInfo(transformedProducts);

    return {
      products: transformedProducts,
      total: hideOldZeroStock ? transformedProducts.length : total,
      page,
      limit,
      totalPages: Math.ceil((hideOldZeroStock ? transformedProducts.length : total) / limit),
    };
  }

  /**
   * Get a single product by ID
   */
  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    return transformProduct(product);
  }

  /**
   * Get a single product by slug
   */
  async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    
    if (!product) return null;
    
    // Check if product should be visible
    // Products with "Paczkomaty i Kurier" tag MUST also have "produkt w paczce" tag
    const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];
    const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce|produkty?\s*w\s*paczce/i;
    const tags = product.tags || [];
    
    const hasPaczkomatTag = tags.some((tag: string) => 
      PACZKOMAT_TAGS.some(pt => tag.toLowerCase() === pt.toLowerCase())
    );
    
    if (hasPaczkomatTag) {
      const hasPackageLimitTag = tags.some((tag: string) => 
        PACKAGE_LIMIT_PATTERN.test(tag)
      );
      if (!hasPackageLimitTag) {
        // Product has paczkomat tag but no package limit - should not be visible
        return null;
      }
    }
    
    return transformProduct(product);
  }

  /**
   * Create a new product
   */
  async create(data: Prisma.ProductCreateInput, initialStock?: number) {
    console.log('ProductsService.create called with:', JSON.stringify(data, null, 2));
    try {
      const product = await prisma.product.create({
        data,
        include: {
          images: true,
          category: true,
          variants: true,
        },
      });
      
      // Create inventory entries for variants with default location
      if (product.variants && product.variants.length > 0) {
        // Get default location (first available)
        const defaultLocation = await prisma.location.findFirst({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        });
        
        if (defaultLocation) {
          await prisma.inventory.createMany({
            data: product.variants.map(variant => ({
              variantId: variant.id,
              locationId: defaultLocation.id,
              quantity: initialStock || 0,
              reserved: 0,
              minimum: 0,
            })),
            skipDuplicates: true,
          });
        }
      }
      
      // Queue product for Meilisearch indexing
      await queueProductIndex(product.id).catch(err => 
        console.error('Failed to queue product index:', err)
      );
      
      return product;
    } catch (error: any) {
      console.error('Prisma create error:', error.message);
      console.error('Prisma error code:', error.code);
      console.error('Prisma error meta:', error.meta);
      throw error;
    }
  }

  /**
   * Update an existing product
   * Handles price changes through PriceHistoryService for Omnibus compliance
   */
  async update(
    id: string, 
    data: Prisma.ProductUpdateInput,
    options?: {
      source?: PriceChangeSource;
      changedBy?: string;
      reason?: string;
    }
  ) {
    // Check if price is being updated
    const newPrice = data.price;
    const hasNewPrice = newPrice !== undefined;
    
    // If price is changing, use PriceHistoryService for Omnibus compliance
    if (hasNewPrice && typeof newPrice === 'number') {
      // Extract price from update data - it will be handled by priceHistoryService
      const { price: _extractedPrice, ...dataWithoutPrice } = data as any;
      
      // First update other fields (without price)
      if (Object.keys(dataWithoutPrice).length > 0) {
        await prisma.product.update({
          where: { id },
          data: dataWithoutPrice,
        });
      }
      
      // Then update price with history tracking (Omnibus)
      await priceHistoryService.updateProductPrice({
        productId: id,
        newPrice,
        source: options?.source || PriceChangeSource.ADMIN,
        changedBy: options?.changedBy,
        reason: options?.reason,
      });
    } else {
      // No price change - standard update
      await prisma.product.update({
        where: { id },
        data,
      });
    }
    
    // Fetch updated product with relations
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    
    // Queue product for Meilisearch reindexing
    if (product) {
      await queueProductIndex(product.id).catch(err => 
        console.error('Failed to queue product reindex:', err)
      );
    }
    
    return product;
  }

  /**
   * Update product price with full Omnibus compliance
   * Use this method when you need explicit control over price changes
   */
  async updatePrice(
    productId: string,
    newPrice: number,
    source: PriceChangeSource,
    changedBy?: string,
    reason?: string
  ) {
    const result = await priceHistoryService.updateProductPrice({
      productId,
      newPrice,
      source,
      changedBy,
      reason,
    });
    
    // Queue for reindexing
    await queueProductIndex(productId).catch(err => 
      console.error('Failed to queue product reindex:', err)
    );
    
    return result;
  }

  /**
   * Update variant price with full Omnibus compliance
   */
  async updateVariantPrice(
    variantId: string,
    newPrice: number,
    source: PriceChangeSource,
    changedBy?: string,
    reason?: string
  ) {
    // Get variant to find product ID for reindexing
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    
    const result = await priceHistoryService.updateVariantPrice({
      variantId,
      newPrice,
      source,
      changedBy,
      reason,
    });
    
    // Queue parent product for reindexing
    if (variant?.productId) {
      await queueProductIndex(variant.productId).catch(err => 
        console.error('Failed to queue product reindex:', err)
      );
    }
    
    return result;
  }

  /**
   * Update stock for multiple variants
   */
  async updateVariantsStock(variantIds: string[], quantity: number) {
    // Get default location
    const defaultLocation = await prisma.location.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    
    if (!defaultLocation) {
      console.error('No default location found for inventory update');
      return;
    }

    for (const variantId of variantIds) {
      await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId,
            locationId: defaultLocation.id,
          },
        },
        update: {
          quantity,
        },
        create: {
          variantId,
          locationId: defaultLocation.id,
          quantity,
          reserved: 0,
          minimum: 0,
        },
      });
    }
  }

  /**
   * Soft delete a product (set status to ARCHIVED)
   */
  async delete(id: string) {
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    
    // Queue product for removal from Meilisearch
    await queueProductDelete(id).catch(err => 
      console.error('Failed to queue product delete:', err)
    );
    
    return product;
  }

  /**
   * Bulk import products from CSV/XLSX
   */
  async bulkImport(products: Prisma.ProductCreateInput[]) {
    return prisma.$transaction(
      products.map((product) =>
        prisma.product.create({ data: product })
      )
    );
  }

  /**
   * Get available filters for products based on category
   */
  async getFilters(categorySlug?: string) {
    // Build where clause
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    };

    // If category specified, get all subcategory IDs as well
    let categoryIds: string[] = [];
    if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: {
          children: {
            include: {
              children: true,
            },
          },
        },
      });

      if (category) {
        categoryIds = [category.id];
        // Add children
        category.children.forEach((child) => {
          categoryIds.push(child.id);
          // Add grandchildren
          child.children.forEach((grandchild) => {
            categoryIds.push(grandchild.id);
          });
        });
        where.categoryId = { in: categoryIds };
      }
    }

    // Get all products matching criteria
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        price: true,
        specifications: true,
        category: {
          select: {
            slug: true,
            parent: {
              select: {
                slug: true,
                parent: {
                  select: { slug: true },
                },
              },
            },
          },
        },
      },
    });

    // Extract brands from specifications
    const brandCounts: Record<string, number> = {};
    const specificationKeys: Set<string> = new Set();
    const specificationValues: Record<string, Record<string, number>> = {};
    let minPrice = Infinity;
    let maxPrice = 0;

    products.forEach((product) => {
      // Price range
      const price = Number(product.price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;

      // Specifications
      const specs = product.specifications as Record<string, any> | null;
      if (specs) {
        // Brand
        if (specs.brand) {
          brandCounts[specs.brand] = (brandCounts[specs.brand] || 0) + 1;
        }

        // Other specs
        Object.entries(specs).forEach(([key, value]) => {
          if (key !== 'brand' && value !== null && value !== undefined) {
            specificationKeys.add(key);
            if (!specificationValues[key]) {
              specificationValues[key] = {};
            }
            const strValue = String(value);
            specificationValues[key][strValue] = (specificationValues[key][strValue] || 0) + 1;
          }
        });
      }
    });

    // Determine which spec filters to show based on category
    const categoryPath = categorySlug ? await this.getCategoryPath(categorySlug) : [];
    const relevantSpecs = this.getRelevantSpecsForCategory(categoryPath);

    // Format brands
    const brands = Object.entries(brandCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Format specifications - only include relevant ones
    const specifications: Record<string, { value: string; count: number }[]> = {};
    relevantSpecs.forEach((specKey) => {
      if (specificationValues[specKey]) {
        specifications[specKey] = Object.entries(specificationValues[specKey])
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => {
            // Sort numerically if possible
            const numA = parseFloat(a.value);
            const numB = parseFloat(b.value);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.value.localeCompare(b.value);
          });
      }
    });

    return {
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === 0 ? 10000 : Math.ceil(maxPrice),
      },
      brands,
      specifications,
      totalProducts: products.length,
    };
  }

  private async getCategoryPath(slug: string): Promise<string[]> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!category) return [];

    const path = [category.slug];
    if (category.parent) {
      path.unshift(category.parent.slug);
      if (category.parent.parent) {
        path.unshift(category.parent.parent.slug);
      }
    }
    return path;
  }

  private getRelevantSpecsForCategory(categoryPath: string[]): string[] {
    // Define which specs are relevant for which categories
    const specsByCategory: Record<string, string[]> = {
      'elektronika': ['brand'],
      'laptopy': ['ram', 'processor', 'storage', 'screenSize', 'graphicsCard'],
      'smartfony': ['ram', 'storage', 'screenSize', 'batteryCapacity'],
      'telewizory': ['screenSize', 'resolution', 'panelType'],
      'sluchawki': ['type', 'connectivity', 'noiseCancellation'],
      'moda': ['size', 'material', 'color'],
      'agd': ['powerConsumption', 'energyClass', 'capacity'],
    };

    const specs = new Set<string>();
    categoryPath.forEach((slug) => {
      const categorySpecs = specsByCategory[slug];
      if (categorySpecs) {
        categorySpecs.forEach((spec) => specs.add(spec));
      }
    });

    return Array.from(specs);
  }

  /**
   * Get excluded product IDs from carousel settings
   */
  private async getExcludedProductIds(): Promise<string[]> {
    try {
      const settings = await prisma.settings.findUnique({
        where: { key: 'carousel_exclusions' },
      });
      
      if (settings?.value) {
        const parsed = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
        const exclusions = parsed as { excludedProductIds?: string[] };
        return exclusions.excludedProductIds || [];
      }
    } catch (error) {
      console.error('Error reading carousel exclusions:', error);
    }
    return [];
  }

  /**
   * Get bestsellers based on actual sales data from OrderItems
   * Returns products sorted by number of units sold
   */
  async getBestsellers(options: {
    limit?: number;
    category?: string;
    days?: number; // How many days back to look for sales
  } = {}): Promise<any[]> {
    const { limit = 20, category, days = 90 } = options;

    // Get excluded product IDs
    const excludedProductIds = await this.getExcludedProductIds();

    // Check if admin has manually selected some bestsellers (they go first)
    // Only apply manual products when NOT filtering by category (category filter = different carousel like Toys)
    let manualProducts: any[] = [];
    let manualProductIds: string[] = [];
    
    if (!category) {
      try {
        const settings = await prisma.settings.findUnique({
          where: { key: 'homepage_carousels' },
        });
        
        if (settings?.value) {
          const parsed = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
          const carousels = parsed as Record<string, { productIds?: string[]; isAutomatic?: boolean }>;
          const bestsellerIds = carousels.bestsellers?.productIds;
          if (bestsellerIds && bestsellerIds.length > 0) {
            manualProductIds = bestsellerIds;
            
            const products = await prisma.product.findMany({
              where: {
                id: { in: bestsellerIds },
                status: 'ACTIVE',
              },
              include: {
                images: { orderBy: { order: 'asc' } },
                category: true,
                variants: { include: { inventory: true } },
              },
            });
            
            // Sort to match order in productIds
            manualProducts = bestsellerIds
              .map(id => products.find(p => p.id === id))
              .filter(Boolean);
            manualProducts = transformProducts(manualProducts);
          }
        }
      } catch (error) {
        console.error('Error reading carousel settings:', error);
      }
    }

    // If we already have enough manual products, return them
    if (manualProducts.length >= limit) {
      return manualProducts.slice(0, limit);
    }

    // Get automatic bestsellers to fill remaining slots
    const remainingSlots = limit - manualProducts.length;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get order items from completed orders in the time period
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          paymentStatus: 'PAID',
        },
      },
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: { orderBy: { order: 'asc' } },
                category: true,
                variants: {
                  include: { inventory: true },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate sales by product
    const productSalesMap = new Map<string, { product: any; soldCount: number }>();

    for (const item of orderItems) {
      const product = item.variant.product;
      
      // Skip if category filter doesn't match
      if (category && product.category?.slug !== category) {
        continue;
      }

      // Skip draft/archived products
      if (product.status !== 'ACTIVE') {
        continue;
      }

      const existing = productSalesMap.get(product.id);
      if (existing) {
        existing.soldCount += item.quantity;
      } else {
        productSalesMap.set(product.id, {
          product: transformProduct(product),
          soldCount: item.quantity,
        });
      }
    }

    // Sort by sold count and get automatic bestsellers (excluding manual ones and excluded ones)
    const automaticBestsellers = Array.from(productSalesMap.values())
      .filter(item => !manualProductIds.includes(item.product.id)) // Exclude already added manual products
      .filter(item => !excludedProductIds.includes(item.product.id)) // Exclude admin-excluded products
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, remainingSlots)
      .map(item => ({
        ...item.product,
        soldCount: item.soldCount,
      }));

    // Combine: manual products first, then automatic bestsellers
    // Filter out products with "Paczkomaty i Kurier" but no "produkt w paczce" tag
    return filterProductsWithPackageInfo([...manualProducts, ...automaticBestsellers]);
  }

  /**
   * Get featured products - either manually curated from Settings or fallback to newest
   */
  async getFeatured(options: {
    limit?: number;
    productIds?: string[]; // Manually selected product IDs (override)
  } = {}): Promise<any[]> {
    const { limit = 20, productIds } = options;

    // Get excluded product IDs
    const excludedProductIds = await this.getExcludedProductIds();

    // Check Settings for admin-curated products (they go first)
    let manualProducts: any[] = [];
    let manualProductIds: string[] = [];
    
    try {
      const settings = await prisma.settings.findUnique({
        where: { key: 'homepage_carousels' },
      });
      
      if (settings?.value) {
        const parsed = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
        const carousels = parsed as Record<string, { productIds?: string[]; isAutomatic?: boolean }>;
        const adminFeaturedIds = carousels.featured?.productIds;
        if (adminFeaturedIds && adminFeaturedIds.length > 0) {
          manualProductIds = adminFeaturedIds;
          
          const products = await prisma.product.findMany({
            where: {
              id: { in: adminFeaturedIds },
              status: 'ACTIVE',
            },
            include: {
              images: { orderBy: { order: 'asc' } },
              category: true,
              variants: { include: { inventory: true } },
            },
          });
          
          manualProducts = adminFeaturedIds
            .map(id => products.find(p => p.id === id))
            .filter(Boolean);
          manualProducts = transformProducts(manualProducts);
        }
      }
    } catch (error) {
      console.error('Error reading carousel settings:', error);
    }

    // Override with directly passed productIds if provided
    if (productIds && productIds.length > 0) {
      manualProductIds = productIds;
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          status: 'ACTIVE',
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          category: true,
          variants: { include: { inventory: true } },
        },
      });
      manualProducts = productIds
        .map(id => products.find(p => p.id === id))
        .filter(Boolean);
      manualProducts = transformProducts(manualProducts);
    }

    // If we already have enough manual products, return them
    if (manualProducts.length >= limit) {
      return manualProducts.slice(0, limit);
    }

    // Get diverse automatic products from various categories
    // Exclude boring items like phone cases, covers, etc.
    const boringKeywords = ['etui', 'case', 'pokrowiec', 'folia', 'szkło', 'kabel', 'ładowarka', 'adapter'];
    const remainingSlots = limit - manualProducts.length;
    
    // Get products from different categories for diversity
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, slug: true },
    });
    
    const productsPerCategory = Math.ceil(remainingSlots / Math.max(categories.length, 1)) + 2;
    let allCandidates: any[] = [];
    
    for (const category of categories) {
      const categoryProducts = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          price: { gt: 10 }, // Skip very cheap items
          categoryId: category.id,
          id: { notIn: [...manualProductIds, ...excludedProductIds] },
          // Exclude boring product names
          NOT: {
            OR: boringKeywords.map(keyword => ({
              name: { contains: keyword, mode: 'insensitive' as const },
            })),
          },
        },
        orderBy: [
          { compareAtPrice: 'desc' }, // Products with discounts first
          { createdAt: 'desc' },
        ],
        take: productsPerCategory,
        include: {
          images: { orderBy: { order: 'asc' } },
          category: true,
          variants: { include: { inventory: true } },
        },
      });
      allCandidates.push(...categoryProducts);
    }
    
    // Shuffle and pick diverse products
    const shuffled = allCandidates.sort(() => Math.random() - 0.5);
    
    // Ensure diversity - don't pick too many from same category
    const picked: any[] = [];
    const categoryCount: Record<string, number> = {};
    const maxPerCategory = Math.ceil(remainingSlots / 3);
    
    for (const product of shuffled) {
      if (picked.length >= remainingSlots) break;
      const catId = product.categoryId || 'none';
      if ((categoryCount[catId] || 0) < maxPerCategory) {
        picked.push(product);
        categoryCount[catId] = (categoryCount[catId] || 0) + 1;
      }
    }
    
    // If not enough, fill with remaining
    if (picked.length < remainingSlots) {
      for (const product of shuffled) {
        if (picked.length >= remainingSlots) break;
        if (!picked.some(p => p.id === product.id)) {
          picked.push(product);
        }
      }
    }

    // Combine: manual products first, then diverse automatic
    // Filter out products with "Paczkomaty i Kurier" but no "produkt w paczce" tag
    return filterProductsWithPackageInfo([...manualProducts, ...transformProducts(picked)]);
  }

  /**
   * Get seasonal products based on tags or settings
   */
  async getSeasonal(options: {
    limit?: number;
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
  } = {}): Promise<any[]> {
    const { limit = 20 } = options;

    // Get excluded product IDs
    const excludedProductIds = await this.getExcludedProductIds();

    // Check if admin has manually selected some seasonal products (they go first)
    let manualProducts: any[] = [];
    let manualProductIds: string[] = [];
    
    try {
      const settings = await prisma.settings.findUnique({
        where: { key: 'homepage_carousels' },
      });
      
      if (settings?.value) {
        const parsed = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
        const carousels = parsed as Record<string, { productIds?: string[]; isAutomatic?: boolean }>;
        const seasonalIds = carousels.seasonal?.productIds;
        if (seasonalIds && seasonalIds.length > 0) {
          manualProductIds = seasonalIds;
          
          const products = await prisma.product.findMany({
            where: {
              id: { in: seasonalIds },
              status: 'ACTIVE',
            },
            include: {
              images: { orderBy: { order: 'asc' } },
              category: true,
              variants: { include: { inventory: true } },
            },
          });
          
          manualProducts = seasonalIds
            .map(id => products.find(p => p.id === id))
            .filter(Boolean);
          manualProducts = transformProducts(manualProducts);
        }
      }
    } catch (error) {
      console.error('Error reading carousel settings:', error);
    }

    // If we already have enough manual products, return them
    if (manualProducts.length >= limit) {
      return manualProducts.slice(0, limit);
    }

    // Get automatic seasonal products to fill remaining slots
    const remainingSlots = limit - manualProducts.length;

    // Determine current season if not provided
    const month = new Date().getMonth() + 1;
    let season = options.season;
    if (!season) {
      if (month >= 3 && month <= 5) season = 'spring';
      else if (month >= 6 && month <= 8) season = 'summer';
      else if (month >= 9 && month <= 11) season = 'autumn';
      else season = 'winter';
    }

    // Map season to Polish tags that might be in the database
    const seasonTags: Record<string, string[]> = {
      spring: ['wiosna', 'wiosenny', 'wiosenne', 'spring'],
      summer: ['lato', 'letni', 'letnie', 'summer', 'plaża', 'wakacje'],
      autumn: ['jesień', 'jesien', 'jesienny', 'jesienne', 'autumn'],
      winter: ['zima', 'zimowy', 'zimowe', 'winter', 'święta', 'boże narodzenie', 'choinka', 'śnieg'],
    };

    // Winter-specific categories for better results
    const winterCategories = ['dziecko', 'zabawki', 'elektronika', 'dom-i-ogrod'];

    const tags = seasonTags[season] || [];

    // Try to find products with seasonal tags (excluding manual and admin-excluded ones)
    let automaticProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        price: { gt: 0 },
        tags: { hasSome: tags },
        id: { notIn: [...manualProductIds, ...excludedProductIds] },
      },
      orderBy: { createdAt: 'desc' },
      take: remainingSlots,
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        variants: {
          include: { inventory: true },
        },
      },
    });

    // If no tagged products, fallback to products from relevant categories
    if (automaticProducts.length < remainingSlots) {
      const fallbackCategories = season === 'winter' ? winterCategories : [];
      
      const additionalProducts = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          price: { gt: 0 },
          id: { notIn: [...manualProductIds, ...excludedProductIds, ...automaticProducts.map(p => p.id)] },
          ...(fallbackCategories.length > 0 && {
            category: { slug: { in: fallbackCategories } },
          }),
        },
        orderBy: [
          { compareAtPrice: 'desc' }, // Products on sale first
          { createdAt: 'desc' },
        ],
        take: remainingSlots - automaticProducts.length,
        include: {
          images: { orderBy: { order: 'asc' } },
          category: true,
          variants: {
            include: { inventory: true },
          },
        },
      });

      automaticProducts = [...automaticProducts, ...additionalProducts];
    }

    // Combine: manual products first, then automatic
    // Filter out products with "Paczkomaty i Kurier" but no "produkt w paczce" tag
    return filterProductsWithPackageInfo([...manualProducts, ...transformProducts(automaticProducts)]);
  }

  /**
   * Get new products - products added in the last 14 days
   * Supports admin-curated manual selection with automatic fallback
   */
  async getNewProducts(options: {
    limit?: number;
    days?: number; // How many days back to look (default 14)
  } = {}): Promise<any[]> {
    const { limit = 20, days = 14 } = options;

    // Get excluded product IDs
    const excludedProductIds = await this.getExcludedProductIds();

    // Check if admin has manually selected some new products (they go first)
    let manualProducts: any[] = [];
    let manualProductIds: string[] = [];
    
    try {
      const settings = await prisma.settings.findUnique({
        where: { key: 'homepage_carousels' },
      });
      
      if (settings?.value) {
        const parsed = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
        const carousels = parsed as Record<string, { productIds?: string[]; isAutomatic?: boolean }>;
        const newProductIds = carousels.newProducts?.productIds;
        if (newProductIds && newProductIds.length > 0) {
          manualProductIds = newProductIds;
          
          const products = await prisma.product.findMany({
            where: {
              id: { in: newProductIds },
              status: 'ACTIVE',
            },
            include: {
              images: { orderBy: { order: 'asc' } },
              category: true,
              variants: { include: { inventory: true } },
            },
          });
          
          // Maintain order from settings
          manualProducts = newProductIds
            .map(id => products.find(p => p.id === id))
            .filter(Boolean);
          manualProducts = transformProducts(manualProducts);
        }
      }
    } catch (error) {
      console.error('Error reading carousel settings:', error);
    }

    // If we already have enough manual products, return them
    if (manualProducts.length >= limit) {
      return manualProducts.slice(0, limit);
    }

    // Get automatic new products to fill remaining slots
    const remainingSlots = limit - manualProducts.length;

    // Calculate the date threshold (products from last X days)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Fetch products added in the last X days (excluding manual and admin-excluded ones)
    const automaticProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        price: { gt: 0 },
        createdAt: { gte: dateThreshold },
        id: { notIn: [...manualProductIds, ...excludedProductIds] },
      },
      orderBy: { createdAt: 'desc' },
      take: remainingSlots,
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        variants: {
          include: { inventory: true },
        },
      },
    });

    // Combine: manual products first, then automatic new products
    // Filter out products with "Paczkomaty i Kurier" but no "produkt w paczce" tag
    return filterProductsWithPackageInfo([...manualProducts, ...transformProducts(automaticProducts)]);
  }

  /**
   * Get products from the same warehouse/wholesaler as the given product
   * Used for "Zamów w jednej przesyłce" recommendations
   */
  async getSameWarehouseProducts(productId: string, options: { limit?: number } = {}) {
    const { limit = 6 } = options;

    // First get the source product to find its wholesaler tag
    const sourceProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, tags: true },
    });

    if (!sourceProduct) {
      return { products: [], wholesaler: null };
    }

    // Extract wholesaler from tags
    const wholesaler = this.extractWholesalerFromTags(sourceProduct.tags);
    
    if (!wholesaler) {
      return { products: [], wholesaler: null };
    }

    // Find other products with the same wholesaler tag
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        price: { gt: 0 },
        id: { not: productId }, // Exclude the source product
        tags: { has: wholesaler }, // Same wholesaler tag
        // Must have at least one delivery tag to be visible
        OR: DELIVERY_TAGS.map(tag => ({ tags: { has: tag } })),
      },
      orderBy: [
        { review_count: 'desc' }, // Popular products first
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        variants: {
          include: { inventory: true },
        },
      },
    });

    return {
      products: filterProductsWithPackageInfo(transformProducts(products)),
      wholesaler: this.getWholesalerDisplayName(wholesaler),
    };
  }

  /**
   * Extract wholesaler tag from product tags
   */
  private extractWholesalerFromTags(tags: string[]): string | null {
    const WHOLESALER_TAGS = ['Ikonka', 'BTP', 'HP', 'Gastro', 'Horeca', 'Hurtownia Przemysłowa', 'Leker', 'Forcetop'];
    
    for (const tag of tags) {
      // Direct match
      if (WHOLESALER_TAGS.includes(tag)) {
        return tag;
      }
      // Match pattern like "hurtownia:HP"
      const match = tag.match(/^hurtownia[:\-_](.+)$/i);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Get human-readable warehouse display name
   */
  private getWholesalerDisplayName(wholesaler: string): string {
    const DISPLAY_NAMES: Record<string, string> = {
      'HP': 'Magazyn Zielona Góra',
      'Hurtownia Przemysłowa': 'Magazyn Zielona Góra',
      'Ikonka': 'Magazyn Białystok',
      'BTP': 'Magazyn Chotów',
      'Leker': 'Magazyn Chynów',
      'Gastro': 'Magazyn Centralny',
      'Horeca': 'Magazyn Centralny',
      'Forcetop': 'Magazyn Centralny',
    };
    return DISPLAY_NAMES[wholesaler] || wholesaler;
  }
}

export const productsService = new ProductsService();