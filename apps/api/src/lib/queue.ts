/**
 * BullMQ Queue Configuration
 * Manages background job queues for async operations
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';

// Queue names
export const QUEUE_NAMES = {
  SEARCH_INDEX: 'search-index',
  EMAIL: 'email',
  IMPORT: 'import',
  EXPORT: 'export',
  INVENTORY_SYNC: 'inventory-sync',
  SHIPPING: 'shipping',
  RESERVATION_CLEANUP: 'reservation-cleanup',
  BASELINKER_SYNC: 'baselinker-sync',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Redis connection for BullMQ
// Parse REDIS_URL or fall back to individual env vars or localhost
function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined, // Enable TLS for rediss://
      };
    } catch (error) {
      console.error('❌ Failed to parse REDIS_URL:', error);
    }
  }
  
  // Fallback to individual env vars or localhost
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

export const queueConnection = getRedisConnection();

// Queue instances
const queues: Map<string, Queue> = new Map();

// Queue events instances (for monitoring)
const queueEvents: Map<string, QueueEvents> = new Map();

/**
 * Get or create a queue instance
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, { 
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(name: string): QueueEvents {
  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, { connection: queueConnection });
    queueEvents.set(name, events);
  }
  return queueEvents.get(name)!;
}

/**
 * Search Index Queue - for Meilisearch operations
 */
export const searchIndexQueue = getQueue(QUEUE_NAMES.SEARCH_INDEX);

/**
 * Email Queue - for sending emails
 */
export const emailQueue = getQueue(QUEUE_NAMES.EMAIL);

/**
 * Add a job to index a single product
 */
export async function queueProductIndex(productId: string): Promise<void> {
  await searchIndexQueue.add('index-product', { productId }, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

/**
 * Add a job to reindex all products
 */
export async function queueFullReindex(): Promise<void> {
  await searchIndexQueue.add('reindex-all', {}, {
    removeOnComplete: 10,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

/**
 * Add a job to delete a product from index
 */
export async function queueProductDelete(productId: string): Promise<void> {
  await searchIndexQueue.add('delete-product', { productId }, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
  });
}

/**
 * Add a job to send an email
 */
export async function queueEmail(data: {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}): Promise<void> {
  await emailQueue.add('send-email', data, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

// ========================================
// Import/Export Queue
// ========================================

export const importQueue = getQueue(QUEUE_NAMES.IMPORT);
export const exportQueue = getQueue(QUEUE_NAMES.EXPORT);

export interface ImportJobData {
  type: 'products' | 'inventory' | 'categories';
  fileUrl: string;
  userId: string;
  options?: {
    updateExisting?: boolean;
    skipErrors?: boolean;
  };
}

export interface ExportJobData {
  type: 'products' | 'orders' | 'inventory' | 'customers';
  filters?: Record<string, unknown>;
  format: 'csv' | 'xlsx';
  userId: string;
}

/**
 * Queue a CSV/XLSX import job
 */
export async function queueImport(data: ImportJobData): Promise<string> {
  const job = await importQueue.add('import', data, {
    attempts: 1, // Don't retry imports
    removeOnComplete: 50,
    removeOnFail: 20,
  });
  return job.id || '';
}

/**
 * Queue an export job
 */
export async function queueExport(data: ExportJobData): Promise<string> {
  const job = await exportQueue.add('export', data, {
    attempts: 2,
    removeOnComplete: 50,
    removeOnFail: 20,
  });
  return job.id || '';
}

// ========================================
// Inventory Sync Queue
// ========================================

export const inventorySyncQueue = getQueue(QUEUE_NAMES.INVENTORY_SYNC);

export interface InventorySyncJobData {
  type: 'sync-all' | 'sync-location' | 'low-stock-check' | 'reservation-cleanup';
  locationId?: string;
}

/**
 * Queue inventory synchronization
 */
export async function queueInventorySync(data: InventorySyncJobData): Promise<void> {
  await inventorySyncQueue.add('inventory-sync', data, {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

/**
 * Queue low stock check (runs periodically)
 */
export async function queueLowStockCheck(): Promise<void> {
  await inventorySyncQueue.add(
    'low-stock-check',
    { type: 'low-stock-check' },
    {
      attempts: 3,
      removeOnComplete: 100,
    }
  );
}

// ========================================
// Shipping Queue
// ========================================

export const shippingQueue = getQueue(QUEUE_NAMES.SHIPPING);

export interface ShippingJobData {
  type: 'generate-label' | 'track-shipment' | 'notify-delivery';
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
}

/**
 * Queue shipping label generation
 */
export async function queueShippingLabel(orderId: string, carrier: string): Promise<void> {
  await shippingQueue.add('generate-label', {
    type: 'generate-label',
    orderId,
    carrier,
  }, {
    attempts: 3,
    removeOnComplete: 50,
  });
}

/**
 * Queue shipment tracking update
 */
export async function queueTrackShipment(orderId: string, trackingNumber: string): Promise<void> {
  await shippingQueue.add('track-shipment', {
    type: 'track-shipment',
    orderId,
    trackingNumber,
  }, {
    attempts: 5,
    removeOnComplete: 100,
  });
}

// ========================================
// Reservation Cleanup Queue
// ========================================

export const reservationCleanupQueue = getQueue(QUEUE_NAMES.RESERVATION_CLEANUP);

/**
 * Queue expired reservation cleanup
 */
export async function queueReservationCleanup(): Promise<void> {
  await reservationCleanupQueue.add(
    'cleanup-expired',
    { timestamp: Date.now() },
    {
      attempts: 3,
      removeOnComplete: 50,
    }
  );
}

/**
 * Schedule recurring reservation cleanup (every 5 minutes)
 */
export async function scheduleReservationCleanup(): Promise<void> {
  await reservationCleanupQueue.add(
    'cleanup-expired',
    { timestamp: Date.now() },
    {
      repeat: {
        every: 5 * 60 * 1000, // 5 minutes
      },
      removeOnComplete: 10,
    }
  );
}

// ========================================
// Queue Management
// ========================================

/**
 * Get all queues for monitoring
 */
export function getAllQueues(): Queue[] {
  return [
    getQueue(QUEUE_NAMES.SEARCH_INDEX),
    getQueue(QUEUE_NAMES.EMAIL),
    getQueue(QUEUE_NAMES.IMPORT),
    getQueue(QUEUE_NAMES.EXPORT),
    getQueue(QUEUE_NAMES.INVENTORY_SYNC),
    getQueue(QUEUE_NAMES.SHIPPING),
    getQueue(QUEUE_NAMES.RESERVATION_CLEANUP),
  ];
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats(queueName: string): Promise<{
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Get all queue stats
 */
export async function getAllQueueStats(): Promise<Array<{
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}>> {
  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name))
  );
  return stats;
}

/**
 * Close all queue connections (for graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
  // Close queue events first
  for (const events of queueEvents.values()) {
    await events.close();
  }
  queueEvents.clear();

  // Then close queues
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}

