/**
 * Baselinker Sync Worker
 * 
 * Handles background synchronization tasks:
 * - Order status sync from Baselinker to our shop
 * - Runs every 15 minutes automatically
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection, getQueue } from '../lib/queue';
import { orderStatusSyncService } from '../services/order-status-sync.service';

interface OrderStatusSyncJobData {
  timestamp: number;
  hoursBack?: number;
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
 * Schedule recurring order status sync
 * Runs every 15 minutes
 */
export async function scheduleBaselinkerSync(): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.BASELINKER_SYNC);
  
  // Remove existing repeatable jobs first
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'sync-order-statuses') {
      await queue.removeRepeatableByKey(job.key);
    }
  }
  
  // Add new repeatable job - every 15 minutes
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
}
