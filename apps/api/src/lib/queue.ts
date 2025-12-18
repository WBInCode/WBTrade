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
} as const;

// Redis connection for BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Queue instances
const queues: Map<string, Queue> = new Map();

/**
 * Get or create a queue instance
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection });
    queues.set(name, queue);
  }
  return queues.get(name)!;
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

/**
 * Close all queue connections (for graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}
