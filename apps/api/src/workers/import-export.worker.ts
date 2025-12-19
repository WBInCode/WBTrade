/**
 * Import/Export Worker
 * Handles CSV/XLSX imports and exports
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection, queueEmail, ImportJobData, ExportJobData } from '../lib/queue';
import { prisma } from '../db';
import { queueProductIndex } from '../lib/queue';

/**
 * Process product import from CSV/XLSX
 */
async function processProductImport(
  fileUrl: string,
  userId: string,
  options: { updateExisting?: boolean; skipErrors?: boolean } = {}
): Promise<{ imported: number; updated: number; errors: string[] }> {
  const { updateExisting = false, skipErrors = true } = options;
  
  // TODO: In production, download and parse the file
  // For now, simulate import process
  console.log(`[ImportWorker] Processing product import from: ${fileUrl}`);
  console.log(`[ImportWorker] Options: updateExisting=${updateExisting}, skipErrors=${skipErrors}`);
  
  // Simulated import data (in production, parse CSV/XLSX)
  const mockProducts = [
    { sku: 'IMPORT-001', name: 'Imported Product 1', price: 99.99 },
    { sku: 'IMPORT-002', name: 'Imported Product 2', price: 149.99 },
  ];
  
  let imported = 0;
  let updated = 0;
  const errors: string[] = [];
  
  for (const productData of mockProducts) {
    try {
      // Check if product exists
      const existing = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });
      
      if (existing) {
        if (updateExisting) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: productData.name,
              price: productData.price,
            },
          });
          updated++;
          
          // Queue for search indexing
          await queueProductIndex(existing.id);
        } else {
          errors.push(`Product ${productData.sku} already exists`);
        }
      } else {
        const newProduct = await prisma.product.create({
          data: {
            sku: productData.sku,
            name: productData.name,
            slug: productData.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            price: productData.price,
            status: 'DRAFT',
          },
        });
        imported++;
        
        // Queue for search indexing
        await queueProductIndex(newProduct.id);
      }
    } catch (error) {
      const errorMsg = `Error importing ${productData.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (skipErrors) {
        errors.push(errorMsg);
      } else {
        throw new Error(errorMsg);
      }
    }
  }
  
  return { imported, updated, errors };
}

/**
 * Process inventory import
 */
async function processInventoryImport(
  fileUrl: string,
  userId: string,
  options: { updateExisting?: boolean; skipErrors?: boolean } = {}
): Promise<{ processed: number; errors: string[] }> {
  console.log(`[ImportWorker] Processing inventory import from: ${fileUrl}`);
  
  // TODO: Implement actual CSV/XLSX parsing
  // This is a mock implementation
  
  return { processed: 0, errors: [] };
}

/**
 * Process category import
 */
async function processCategoryImport(
  fileUrl: string,
  userId: string,
  options: { updateExisting?: boolean; skipErrors?: boolean } = {}
): Promise<{ imported: number; errors: string[] }> {
  console.log(`[ImportWorker] Processing category import from: ${fileUrl}`);
  
  // TODO: Implement actual CSV/XLSX parsing
  
  return { imported: 0, errors: [] };
}

/**
 * Export products to CSV/XLSX
 */
async function exportProducts(
  filters: Record<string, unknown>,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<{ fileUrl: string; count: number }> {
  console.log(`[ExportWorker] Exporting products as ${format}`);
  
  // Get products based on filters
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
      images: { take: 1 },
    },
    take: 10000, // Limit for safety
  });
  
  // TODO: Generate actual CSV/XLSX file and upload to S3/R2
  // For now, simulate export
  
  const mockFileUrl = `https://storage.wbtrade.pl/exports/products-${Date.now()}.${format}`;
  
  console.log(`[ExportWorker] Exported ${products.length} products to ${mockFileUrl}`);
  
  return {
    fileUrl: mockFileUrl,
    count: products.length,
  };
}

/**
 * Export orders
 */
async function exportOrders(
  filters: Record<string, unknown>,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<{ fileUrl: string; count: number }> {
  console.log(`[ExportWorker] Exporting orders as ${format}`);
  
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
    take: 10000,
  });
  
  const mockFileUrl = `https://storage.wbtrade.pl/exports/orders-${Date.now()}.${format}`;
  
  return {
    fileUrl: mockFileUrl,
    count: orders.length,
  };
}

/**
 * Export inventory
 */
async function exportInventory(
  filters: Record<string, unknown>,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<{ fileUrl: string; count: number }> {
  console.log(`[ExportWorker] Exporting inventory as ${format}`);
  
  const inventory = await prisma.inventory.findMany({
    include: {
      variant: { include: { product: true } },
      location: true,
    },
  });
  
  const mockFileUrl = `https://storage.wbtrade.pl/exports/inventory-${Date.now()}.${format}`;
  
  return {
    fileUrl: mockFileUrl,
    count: inventory.length,
  };
}

/**
 * Export customers
 */
async function exportCustomers(
  filters: Record<string, unknown>,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<{ fileUrl: string; count: number }> {
  console.log(`[ExportWorker] Exporting customers as ${format}`);
  
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  
  const mockFileUrl = `https://storage.wbtrade.pl/exports/customers-${Date.now()}.${format}`;
  
  return {
    fileUrl: mockFileUrl,
    count: customers.length,
  };
}

/**
 * Create and start the import worker
 */
export function startImportWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.IMPORT,
    async (job: Job<ImportJobData>) => {
      console.log(`[ImportWorker] Processing job: ${job.name} (${job.id})`);
      
      const { type, fileUrl, userId, options } = job.data;
      
      let result;
      
      switch (type) {
        case 'products':
          result = await processProductImport(fileUrl, userId, options);
          break;
        case 'inventory':
          result = await processInventoryImport(fileUrl, userId, options);
          break;
        case 'categories':
          result = await processCategoryImport(fileUrl, userId, options);
          break;
        default:
          throw new Error(`Unknown import type: ${type}`);
      }
      
      // Notify user about completion
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      
      if (user) {
        await queueEmail({
          to: user.email,
          subject: `Import ${type} zakończony`,
          template: 'newsletter', // Generic template
          context: {
            subject: `Import ${type} zakończony`,
            content: `
              <h1>Import zakończony</h1>
              <p>Zaimportowano: ${(result as any).imported || (result as any).processed || 0}</p>
              <p>Zaktualizowano: ${(result as any).updated || 0}</p>
              <p>Błędy: ${(result as any).errors?.length || 0}</p>
            `,
            textContent: `Import zakończony. Szczegóły w panelu admin.`,
          },
        });
      }
      
      return result;
    },
    {
      connection: queueConnection,
      concurrency: 2, // Limit concurrent imports
    }
  );

  worker.on('completed', (job) => {
    console.log(`[ImportWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ImportWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('✓ Import worker started');
  return worker;
}

/**
 * Create and start the export worker
 */
export function startExportWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.EXPORT,
    async (job: Job<ExportJobData>) => {
      console.log(`[ExportWorker] Processing job: ${job.name} (${job.id})`);
      
      const { type, filters = {}, format, userId } = job.data;
      
      let result;
      
      switch (type) {
        case 'products':
          result = await exportProducts(filters, format, userId);
          break;
        case 'orders':
          result = await exportOrders(filters, format, userId);
          break;
        case 'inventory':
          result = await exportInventory(filters, format, userId);
          break;
        case 'customers':
          result = await exportCustomers(filters, format, userId);
          break;
        default:
          throw new Error(`Unknown export type: ${type}`);
      }
      
      // Notify user about completion
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      
      if (user) {
        await queueEmail({
          to: user.email,
          subject: `Eksport ${type} gotowy`,
          template: 'newsletter',
          context: {
            subject: `Eksport ${type} gotowy`,
            content: `
              <h1>Eksport zakończony</h1>
              <p>Wyeksportowano: ${result.count} rekordów</p>
              <p><a href="${result.fileUrl}">Pobierz plik</a></p>
            `,
            textContent: `Eksport zakończony. Pobierz: ${result.fileUrl}`,
          },
        });
      }
      
      return result;
    },
    {
      connection: queueConnection,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[ExportWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ExportWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('✓ Export worker started');
  return worker;
}
