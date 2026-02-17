/**
 * Baselinker Sync Worker
 * 
 * Handles background synchronization tasks:
 * - Order status sync from Baselinker to our shop (every 15 minutes)
 * - Stock/inventory sync from Baselinker (daily at 00:00)
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection, getQueue } from '../lib/queue';
import { orderStatusSyncService } from '../services/order-status-sync.service';
import { BaselinkerService } from '../services/baselinker.service';

interface OrderStatusSyncJobData {
  timestamp: number;
  hoursBack?: number;
}

interface StockSyncJobData {
  timestamp: number;
  type: 'stock';
}

/**
 * Create Baselinker sync worker
 */
export function createBaselinkerSyncWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.BASELINKER_SYNC,
    async (job: Job) => {
      console.log(`[BaselinkerSyncWorker] Processing job ${job.name}:`, job.data);

      switch (job.name) {
        case 'sync-order-statuses':
          return await processOrderStatusSync(job);
        case 'sync-stock':
          return await processStockSync(job);
        default:
          console.warn(`[BaselinkerSyncWorker] Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    },
    {
      connection: queueConnection,
      concurrency: 1, // Process one at a time
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BaselinkerSyncWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BaselinkerSyncWorker] Job ${job?.id} failed:`, err);
  });

  console.log('✅ Baselinker sync worker started');
  return worker;
}

/**
 * Process order status synchronization
 */
async function processOrderStatusSync(job: Job<OrderStatusSyncJobData>) {
  const hoursBack = job.data.hoursBack || 6;
  
  console.log(`[BaselinkerSyncWorker] Syncing order statuses (last ${hoursBack} hours)`);
  
  try {
    const result = await orderStatusSyncService.syncOrderStatuses(hoursBack);
    
    console.log(`[BaselinkerSyncWorker] Sync completed: ${result.synced} synced, ${result.skipped} skipped, ${result.errors.length} errors`);
    
    if (result.errors.length > 0) {
      console.warn('[BaselinkerSyncWorker] Errors:', result.errors.slice(0, 5));
    }
    
    return result;
  } catch (error) {
    console.error('[BaselinkerSyncWorker] Sync failed:', error);
    throw error;
  }
}

/**
 * Process stock/inventory synchronization from Baselinker
 */
async function processStockSync(job: Job<StockSyncJobData>) {
  console.log(`[BaselinkerSyncWorker] Starting stock sync from Baselinker`);
  
  try {
    const baselinkerService = new BaselinkerService();
    
    // Run stock sync directly (awaited) — ensures log is properly updated
    const result = await baselinkerService.runStockSyncDirect();
    
    console.log(`[BaselinkerSyncWorker] Stock sync finished: ${result.itemsProcessed} processed, ${result.itemsChanged} changed, syncLogId: ${result.syncLogId}`);
    
    return result;
  } catch (error) {
    console.error('[BaselinkerSyncWorker] Stock sync failed:', error);
    throw error;
  }
}

/**
 * Schedule recurring order status sync
 * Runs every 15 minutes
 */
export async function scheduleBaselinkerSync(): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.BASELINKER_SYNC);
  
  // Remove existing repeatable jobs first
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'sync-order-statuses' || job.name === 'sync-stock') {
      await queue.removeRepeatableByKey(job.key);
    }
  }
  
  // Add new repeatable job - every 15 minutes for order statuses
  await queue.add(
    'sync-order-statuses',
    { 
      timestamp: Date.now(),
      hoursBack: 6 // Check last 6 hours of orders
    },
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
      jobId: 'baselinker-order-status-sync',
    }
  );
  
  console.log('✅ Baselinker order status sync scheduled (every 15 minutes)');
  
  // Add stock sync job - daily at midnight
  await queue.add(
    'sync-stock',
    { 
      timestamp: Date.now(),
      type: 'stock'
    },
    {
      repeat: {
        pattern: '0 0 * * *', // Daily at 00:00
      },
      jobId: 'baselinker-stock-sync',
    }
  );
  
  console.log('✅ Baselinker stock sync scheduled (daily at 00:00)');
}

/**
 * Trigger immediate stock sync (for manual testing or immediate fix)
 */
export async function triggerImmediateStockSync(): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.BASELINKER_SYNC);
  
  const job = await queue.add(
    'sync-stock',
    { 
      timestamp: Date.now(),
      type: 'stock'
    },
    {
      jobId: `immediate-stock-sync-${Date.now()}`,
    }
  );
  
  console.log(`✅ Immediate stock sync triggered, jobId: ${job.id}`);
  return job.id || 'unknown';
}
