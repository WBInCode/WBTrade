import prisma from '../db';
import { ProductStatus } from '@prisma/client';

interface GoogleFeedProduct {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  price: string;
  salePrice?: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  brand?: string;
  gtin?: string;
  mpn?: string;
  productType?: string;
}

/**
 * Escapes special XML characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Strips HTML tags from description
 * Uses iterative approach and removes stray angle brackets
 */
function stripHtml(html: string): string {
  let result = html;
  let previous = '';
  // Iterate until no more tags are found
  while (result !== previous) {
    previous = result;
    result = result.replace(/<[^>]*>/g, '');
  }
  // Remove any remaining stray angle brackets
  result = result.replace(/[<>]/g, '');
  return result.trim();
}

/**
 * Truncates text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generates Google Merchant Center XML feed
 * Optimized for low memory usage - uses pagination
 */
export async function generateGoogleMerchantFeed(baseUrl: string): Promise<string> {
  const BATCH_SIZE = 500; // Process 500 products at a time
  let skip = 0;
  let hasMore = true;
  const feedProducts: GoogleFeedProduct[] = [];

  // Process products in batches to avoid memory issues
  while (hasMore) {
    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
      },
      select: {
        sku: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        barcode: true,
        tags: true,
        baselinkerCategoryPath: true,
        images: {
          select: { url: true },
          orderBy: { order: 'asc' },
          take: 5,
        },
        category: {
          select: { name: true },
        },
        variants: {
          select: {
            inventory: {
              select: { quantity: true, reserved: true },
            },
          },
          take: 1,
        },
      },
      skip,
      take: BATCH_SIZE,
    });

    if (products.length === 0) {
      hasMore = false;
      break;
    }

    for (const product of products) {
      // Calculate total stock
      let totalStock = 0;
      for (const variant of product.variants) {
        for (const inv of variant.inventory) {
          totalStock += inv.quantity - inv.reserved;
        }
      }

      const primaryImage = product.images[0]?.url || '';
      const additionalImages = product.images.slice(1, 5).map((img: { url: string }) => img.url);

      const availability: 'in_stock' | 'out_of_stock' | 'preorder' = totalStock > 0 ? 'in_stock' : 'out_of_stock';

      const price = `${Number(product.price).toFixed(2)} PLN`;
      const salePrice = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
        ? `${Number(product.price).toFixed(2)} PLN`
        : undefined;
      const regularPrice = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
        ? `${Number(product.compareAtPrice).toFixed(2)} PLN`
        : price;

      let productType = '';
      if (product.category) {
        productType = product.category.name;
      }

      let brand = 'WBTrade';
      if (product.tags && product.tags.length > 0) {
        const brandTag = product.tags.find((tag: string) => tag.toLowerCase().startsWith('brand:'));
        if (brandTag) {
          brand = brandTag.replace('brand:', '').trim();
        }
      }

      feedProducts.push({
        id: product.sku,
        title: truncate(product.name, 150),
        description: truncate(stripHtml(product.description || product.name), 5000),
        link: `${baseUrl}/product/${product.slug}`,
        imageLink: primaryImage,
        additionalImageLinks: additionalImages,
        price: salePrice ? regularPrice : price,
        salePrice: salePrice,
        availability,
        condition: 'new',
        brand,
        gtin: product.barcode || undefined,
        mpn: product.sku,
        productType,
      });
    }

    skip += BATCH_SIZE;
    
    // Safety limit - max 50000 products
    if (skip >= 50000) {
      hasMore = false;
    }
  }

  return buildXmlFeed(feedProducts, baseUrl);
}

/**
 * Builds the XML feed string
 */
function buildXmlFeed(products: GoogleFeedProduct[], baseUrl: string): string {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>WBTrade - Sklep internetowy</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Produkty ze sklepu WBTrade</description>`;

  const xmlFooter = `
  </channel>
</rss>`;

  const xmlItems = products.map(product => {
    let item = `
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.title)}</g:title>
      <g:description>${escapeXml(product.description)}</g:description>
      <g:link>${escapeXml(product.link)}</g:link>
      <g:image_link>${escapeXml(product.imageLink)}</g:image_link>`;

    // Additional images (up to 10)
    for (const imgUrl of product.additionalImageLinks) {
      item += `
      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`;
    }

    item += `
      <g:price>${escapeXml(product.price)}</g:price>`;

    if (product.salePrice) {
      item += `
      <g:sale_price>${escapeXml(product.salePrice)}</g:sale_price>`;
    }

    item += `
      <g:availability>${product.availability}</g:availability>
      <g:condition>${product.condition}</g:condition>`;

    if (product.brand) {
      item += `
      <g:brand>${escapeXml(product.brand)}</g:brand>`;
    }

    if (product.gtin) {
      item += `
      <g:gtin>${escapeXml(product.gtin)}</g:gtin>`;
    }

    if (product.mpn) {
      item += `
      <g:mpn>${escapeXml(product.mpn)}</g:mpn>`;
    }

    if (product.productType) {
      item += `
      <g:product_type>${escapeXml(product.productType)}</g:product_type>`;
    }

    item += `
    </item>`;

    return item;
  }).join('');

  return xmlHeader + xmlItems + xmlFooter;
}

/**
 * Get feed statistics - optimized query
 */
export async function getFeedStats(): Promise<{
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  lastUpdated: Date;
}> {
  // Use count instead of fetching all products
  const totalProducts = await prisma.product.count({
    where: {
      status: ProductStatus.ACTIVE,
    },
  });

  // Count products with stock > 0 using raw aggregation
  const productsWithStock = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
    },
    select: {
      id: true,
      variants: {
        select: {
          inventory: {
            select: { quantity: true, reserved: true },
          },
        },
        take: 1,
      },
    },
  });

  let inStock = 0;
  let outOfStock = 0;

  for (const product of productsWithStock) {
    let totalStock = 0;
    for (const variant of product.variants) {
      for (const inv of variant.inventory) {
        totalStock += inv.quantity - inv.reserved;
      }
    }
    if (totalStock > 0) {
      inStock++;
    } else {
      outOfStock++;
    }
  }

  return {
    totalProducts,
    inStock,
    outOfStock,
    lastUpdated: new Date(),
  };
}
