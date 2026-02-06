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
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
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
 */
export async function generateGoogleMerchantFeed(baseUrl: string): Promise<string> {
  // Fetch all active products with their images, variants and inventory
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
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

  const feedProducts: GoogleFeedProduct[] = [];

  for (const product of products) {
    // Calculate total stock across all variants and locations
    let totalStock = 0;
    for (const variant of product.variants) {
      for (const inv of variant.inventory) {
        totalStock += inv.quantity - inv.reserved;
      }
    }

    // Get primary image
    const primaryImage = product.images[0]?.url || '';
    const additionalImages = product.images.slice(1, 10).map((img: { url: string }) => img.url);

    // Determine availability
    let availability: 'in_stock' | 'out_of_stock' | 'preorder' = 'out_of_stock';
    if (totalStock > 0) {
      availability = 'in_stock';
    }

    // Format prices (Google requires format: "99.99 PLN")
    const price = `${Number(product.price).toFixed(2)} PLN`;
    const salePrice = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
      ? `${Number(product.price).toFixed(2)} PLN`
      : undefined;
    const regularPrice = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
      ? `${Number(product.compareAtPrice).toFixed(2)} PLN`
      : price;

    // Build category path for product_type
    let productType = '';
    if (product.category) {
      productType = product.category.name;
      if (product.baselinkerCategoryPath) {
        productType = product.baselinkerCategoryPath.replace(/\s*>\s*/g, ' > ');
      }
    }

    // Extract brand from tags or specifications
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

  // Generate XML
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
 * Get feed statistics
 */
export async function getFeedStats(): Promise<{
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  lastUpdated: Date;
}> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
    },
    include: {
      variants: {
        include: {
          inventory: true,
        },
      },
    },
  });

  let inStock = 0;
  let outOfStock = 0;

  for (const product of products) {
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
    totalProducts: products.length,
    inStock,
    outOfStock,
    lastUpdated: new Date(),
  };
}
