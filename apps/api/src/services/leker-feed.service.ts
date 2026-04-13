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
 * Strips HTML tags from text
 */
function stripHtml(html: string): string {
  let result = html;
  let previous = '';
  while (result !== previous) {
    previous = result;
    result = result.replace(/<[^>]*>/g, '');
  }
  result = result.replace(/[<>]/g, '');
  return result.trim();
}

/**
 * Builds XML for a single Leker product
 */
function buildLekerProductXml(product: {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string | { toNumber(): number };
  compareAtPrice: number | string | { toNumber(): number } | null;
  barcode: string | null;
  tags: string[];
  baselinkerProductId: string | null;
  baselinkerCategoryPath: string | null;
  images: { url: string }[];
  category: { name: string; baselinkerCategoryId: string | null; baselinkerCategoryPath: string | null } | null;
  variants: { barcode: string | null; inventory: { quantity: number; reserved: number }[] }[];
}, baseUrl: string): string {
  // EAN from product barcode or first variant barcode
  const ean = product.barcode || product.variants[0]?.barcode || '';
  if (!ean) return ''; // Skip products without EAN

  // Calculate total stock
  let totalStock = 0;
  for (const variant of product.variants) {
    for (const inv of variant.inventory) {
      totalStock += inv.quantity - inv.reserved;
    }
  }

  const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';
  const price = Number(product.price).toFixed(2);
  const imageUrl = product.images[0]?.url || '';

  // Category from baselinkerCategoryPath or category name
  const categoryPath = product.baselinkerCategoryPath 
    || product.category?.baselinkerCategoryPath 
    || product.category?.name 
    || '';

  const description = stripHtml(product.description || product.name);

  let item = `
    <product>
      <id>${escapeXml(product.id)}</id>
      <sku>${escapeXml(product.sku)}</sku>
      <ean>${escapeXml(ean)}</ean>
      <name><![CDATA[${product.name}]]></name>
      <description><![CDATA[${description}]]></description>
      <price>${price}</price>`;

  if (product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)) {
    item += `
      <compare_at_price>${Number(product.compareAtPrice).toFixed(2)}</compare_at_price>`;
  }

  item += `
      <currency>PLN</currency>
      <url>${escapeXml(`${baseUrl}/products/${product.slug}`)}</url>
      <availability>${availability}</availability>
      <stock>${totalStock}</stock>
      <category><![CDATA[${categoryPath}]]></category>`;

  if (product.category?.name) {
    item += `
      <category_name><![CDATA[${product.category.name}]]></category_name>`;
  }

  if (product.category?.baselinkerCategoryId) {
    item += `
      <category_id>${escapeXml(product.category.baselinkerCategoryId)}</category_id>`;
  }

  if (imageUrl) {
    item += `
      <image>${escapeXml(imageUrl)}</image>`;
  }

  // Additional images
  for (const img of product.images.slice(1, 5)) {
    item += `
      <additional_image>${escapeXml(img.url)}</additional_image>`;
  }

  // Tags
  if (product.tags.length > 0) {
    item += `
      <tags>${escapeXml(product.tags.join(', '))}</tags>`;
  }

  if (product.baselinkerProductId) {
    item += `
      <baselinker_id>${escapeXml(product.baselinkerProductId)}</baselinker_id>`;
  }

  item += `
    </product>`;

  return item;
}

/**
 * Streams Leker products XML feed with EAN and categories
 */
export async function streamLekerFeed(baseUrl: string, res: Response): Promise<void> {
  const BATCH_SIZE = 200;
  let skip = 0;
  let hasMore = true;
  // Count total Leker products for stats
  const totalCount = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'leker-' },
      status: ProductStatus.ACTIVE,
      price: { gt: 0 },
    },
  });

  // Write XML header
  res.write(`<?xml version="1.0" encoding="UTF-8"?>
<feed>
  <shop>
    <name>WBTrade</name>
    <url>${escapeXml(baseUrl)}</url>
    <generated>${new Date().toISOString()}</generated>
    <total_products>${totalCount}</total_products>
  </shop>
  <products>`);

  // Stream products in batches
  while (hasMore) {
    const products = await prisma.product.findMany({
      where: {
        baselinkerProductId: { startsWith: 'leker-' },
        status: ProductStatus.ACTIVE,
        price: { gt: 0 },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        barcode: true,
        tags: true,
        baselinkerProductId: true,
        baselinkerCategoryPath: true,
        images: {
          select: { url: true },
          orderBy: { order: 'asc' },
          take: 5,
        },
        category: {
          select: {
            name: true,
            baselinkerCategoryId: true,
            baselinkerCategoryPath: true,
          },
        },
        variants: {
          select: {
            barcode: true,
            inventory: {
              select: { quantity: true, reserved: true },
            },
          },
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
      const xml = buildLekerProductXml(product, baseUrl);
      if (xml) {
        res.write(xml);
      }
    }

    skip += BATCH_SIZE;

    if (skip >= 50000) {
      hasMore = false;
    }

    await new Promise(resolve => setImmediate(resolve));
  }

  // Write XML footer
  res.write(`
  </products>
</feed>`);
  res.end();
}

/**
 * Get Leker feed statistics
 */
export async function getLekerFeedStats() {
  const total = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'leker-' },
    },
  });

  const active = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'leker-' },
      status: ProductStatus.ACTIVE,
      price: { gt: 0 },
    },
  });

  const withEan = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'leker-' },
      status: ProductStatus.ACTIVE,
      price: { gt: 0 },
      barcode: { not: null },
    },
  });

  const withCategory = await prisma.product.count({
    where: {
      baselinkerProductId: { startsWith: 'leker-' },
      status: ProductStatus.ACTIVE,
      price: { gt: 0 },
      category: { isNot: null },
    },
  });

  return {
    total,
    active,
    withEan,
    withCategory,
    withoutEan: active - withEan,
    withoutCategory: active - withCategory,
  };
}
