/**
 * Baselinker Sync Worker
 *
 * Handles background synchronization tasks:
 * - Order status sync from Baselinker to our shop (every 15 minutes)
 * - Stock/inventory sync from Baselinker (every 2 hours)
 * - Price sync from XML files: Leker + BTP (daily at 06:00)
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection, getQueue } from '../lib/queue';
import { orderStatusSyncService } from '../services/order-status-sync.service';
import { deliveryTrackingService } from '../services/delivery-tracking.service';
import { BaselinkerService } from '../services/baselinker.service';

interface OrderStatusSyncJobData {
  timestamp: number;
  hoursBack?: number;
}

interface StockSyncJobData {
  timestamp: number;
  type: 'stock' | 'price';
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
        case 'sync-delivery-tracking':
          return await processDeliveryTracking(job);
        case 'sync-stock':
          return await processStockSync(job);
        case 'sync-price-xml':
          return await processPriceXmlSync(job);
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
 * Process delivery tracking synchronization
 * Fetches package/courier status for active orders from Baselinker
 */
async function processDeliveryTracking(job: Job) {
  console.log(`[BaselinkerSyncWorker] Syncing delivery tracking statuses`);
  
  try {
    const result = await deliveryTrackingService.syncDeliveryStatuses();
    
    console.log(`[BaselinkerSyncWorker] Delivery tracking sync completed: ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`);
    
    if (result.errors.length > 0) {
      console.warn('[BaselinkerSyncWorker] Delivery tracking errors:', result.errors.slice(0, 5));
    }
    
    return result;
  } catch (error) {
    console.error('[BaselinkerSyncWorker] Delivery tracking sync failed:', error);
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

interface PriceXmlSyncJobData {
  timestamp: number;
  warehouse?: 'leker' | 'btp' | 'all';
}

/**
 * Process price synchronization from XML files (Leker + BTP).
 * Replaces the old Baselinker API price sync.
 */
async function processPriceXmlSync(job: Job<PriceXmlSyncJobData>) {
  const warehouse = job.data.warehouse || 'all';
  console.log(`[BaselinkerSyncWorker] Starting XML price sync (warehouse: ${warehouse})`);

  // Dynamic require so the CJS scripts only load when needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const scriptsDir = path.resolve(__dirname, '../..');  // apps/api/src/workers → apps/api

  let lekerResult: any = null;
  let btpResult: any = null;

  try {
    if (warehouse === 'leker' || warehouse === 'all') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { syncLekerXmlPrices } = require(path.join(scriptsDir, 'sync-leker-xml-prices.js'));
      lekerResult = await syncLekerXmlPrices();
      console.log(`[BaselinkerSyncWorker] Leker XML sync done: ${JSON.stringify(lekerResult)}`);
    }

    if (warehouse === 'btp' || warehouse === 'all') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { syncBtpXmlPrices } = require(path.join(scriptsDir, 'sync-btp-xml-prices.js'));
      btpResult = await syncBtpXmlPrices();
      console.log(`[BaselinkerSyncWorker] BTP XML sync done: ${JSON.stringify(btpResult)}`);
    }

    let hpResult: any = null;
    if (warehouse === 'hp' || warehouse === 'all') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { syncHpXmlPrices } = require(path.join(scriptsDir, 'sync-hp-xml-prices.js'));
      hpResult = await syncHpXmlPrices();
      console.log(`[BaselinkerSyncWorker] HP XML sync done: ${JSON.stringify(hpResult)}`);
    }

    return { success: true, leker: lekerResult, btp: btpResult, hp: hpResult };
  } catch (error) {
    console.error('[BaselinkerSyncWorker] XML price sync failed:', error);
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
    if (job.name === 'sync-order-statuses' || job.name === 'sync-delivery-tracking' || job.name === 'sync-stock' || job.name === 'sync-price' || job.name === 'sync-price-xml') {
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

  // Add delivery tracking sync job - every 15 minutes (offset by 5 min from status sync)
  await queue.add(
    'sync-delivery-tracking',
    {
      timestamp: Date.now(),
    },
    {
      repeat: {
        pattern: '5/15 * * * *', // Every 15 minutes, offset by 5 min
      },
      jobId: 'baselinker-delivery-tracking-sync',
    }
  );

  console.log('✅ Baselinker delivery tracking sync scheduled (every 15 minutes, +5 offset)');
  
  // Add stock sync job - every 2 hours
  await queue.add(
    'sync-stock',
    { 
      timestamp: Date.now(),
      type: 'stock'
    },
    {
      repeat: {
        pattern: '0 */2 * * *', // Every 2 hours at :00
      },
      jobId: 'baselinker-stock-sync',
    }
  );
  
  console.log('✅ Baselinker stock sync scheduled (every 2 hours)');

  // Add XML price sync job - once a day at 06:00
  await queue.add(
    'sync-price-xml',
    {
      timestamp: Date.now(),
      warehouse: 'all',
    },
    {
      repeat: {
        pattern: '0 6 * * *', // Every day at 06:00
      },
      jobId: 'xml-price-sync-daily',
    }
  );

  console.log('✅ XML price sync scheduled (Leker + BTP + HP, daily at 06:00)');
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

/**
 * Trigger immediate XML price sync (manual button in admin panel)
 */
export async function triggerImmediatePriceXmlSync(warehouse: 'leker' | 'btp' | 'hp' | 'all' = 'all'): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.BASELINKER_SYNC);

  const job = await queue.add(
    'sync-price-xml',
    {
      timestamp: Date.now(),
      warehouse,
    },
    {
      jobId: `immediate-price-xml-sync-${warehouse}-${Date.now()}`,
    }
  );

  console.log(`✅ Immediate XML price sync triggered (${warehouse}), jobId: ${job.id}`);
  return job.id || 'unknown';
}
