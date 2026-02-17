import prisma from '../db';
import { ProductStatus } from '@prisma/client';
import { Response } from 'express';

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
 * Builds XML for a single product item
 */
function buildProductXml(product: {
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  price: any;
  compareAtPrice: any;
  barcode: string | null;
  tags: string[];
  baselinkerCategoryPath: string | null;
  images: { url: string }[];
  category: { name: string } | null;
  variants: { inventory: { quantity: number; reserved: number }[] }[];
}, baseUrl: string): string {
  // Calculate total stock
  let totalStock = 0;
  for (const variant of product.variants) {
    for (const inv of variant.inventory) {
      totalStock += inv.quantity - inv.reserved;
    }
  }

  const primaryImage = product.images[0]?.url || '';
  const additionalImages = product.images.slice(1, 5).map((img: { url: string }) => img.url);
  const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';

  const price = `${Number(product.price).toFixed(2)} PLN`;
  const salePrice = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
    ? `${Number(product.price).toFixed(2)} PLN`
    : undefined;
  const regularPrice = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
    ? `${Number(product.compareAtPrice).toFixed(2)} PLN`
    : price;

  const productType = product.category?.name || '';

  let brand = 'WBTrade';
  if (product.tags && product.tags.length > 0) {
    const brandTag = product.tags.find((tag: string) => tag.toLowerCase().startsWith('brand:'));
    if (brandTag) {
      brand = brandTag.replace('brand:', '').trim();
    }
  }

  const title = truncate(product.name, 150);
  const description = truncate(stripHtml(product.description || product.name), 5000);
  const link = `${baseUrl}/product/${product.slug}`;
  const finalPrice = salePrice ? regularPrice : price;

  let item = `
    <item>
      <g:id>${escapeXml(product.sku)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>`;

  for (const imgUrl of additionalImages) {
    item += `
      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`;
  }

  item += `
      <g:price>${escapeXml(finalPrice)}</g:price>`;

  if (salePrice) {
    item += `
      <g:sale_price>${escapeXml(salePrice)}</g:sale_price>`;
  }

  item += `
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>`;

  if (brand) {
    item += `
      <g:brand>${escapeXml(brand)}</g:brand>`;
  }

  if (product.barcode) {
    item += `
      <g:gtin>${escapeXml(product.barcode)}</g:gtin>`;
  }

  item += `
      <g:mpn>${escapeXml(product.sku)}</g:mpn>`;

  if (productType) {
    item += `
      <g:product_type>${escapeXml(productType)}</g:product_type>`;
  }

  item += `
    </item>`;

  return item;
}

/**
 * Streams Google Merchant Center XML feed directly to response
 * Memory-efficient: processes products in small batches and writes immediately
 * Does NOT accumulate all products in memory
 */
export async function streamGoogleMerchantFeed(baseUrl: string, res: Response): Promise<void> {
  const BATCH_SIZE = 200; // Smaller batches for lower memory footprint
  let skip = 0;
  let hasMore = true;

  // Write XML header
  res.write(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>WBTrade - Sklep internetowy</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Produkty ze sklepu WBTrade</description>`);

  // Stream products in batches
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

    // Write each product's XML immediately, don't accumulate
    for (const product of products) {
      res.write(buildProductXml(product, baseUrl));
    }

    skip += BATCH_SIZE;

    // Safety limit - max 50000 products
    if (skip >= 50000) {
      hasMore = false;
    }

    // Allow event loop to breathe between batches
    await new Promise(resolve => setImmediate(resolve));
  }

  // Write XML footer and end response
  res.write(`
  </channel>
</rss>`);
  res.end();
}

/**
 * Legacy non-streaming version (kept for backward compatibility if needed)
 * WARNING: May cause OOM on large catalogs with limited memory
 */
export async function generateGoogleMerchantFeed(baseUrl: string): Promise<string> {
  const BATCH_SIZE = 200;
  let skip = 0;
  let hasMore = true;
  const chunks: string[] = [];

  chunks.push(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>WBTrade - Sklep internetowy</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Produkty ze sklepu WBTrade</description>`);

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
      chunks.push(buildProductXml(product, baseUrl));
    }

    skip += BATCH_SIZE;
    if (skip >= 50000) {
      hasMore = false;
    }
  }

  chunks.push(`
  </channel>
</rss>`);

  return chunks.join('');
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
