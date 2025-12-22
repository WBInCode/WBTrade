/**
 * Baselinker Sync Worker
 * 
 * Handles background synchronization jobs:
 * - Full sync (categories → products → images → stock)
 * - Stock-only sync (more frequent)
 * - Meilisearch reindex after sync
 * 
 * Default schedules:
 * - Full sync: every 60 minutes
 * - Stock sync: every 15 minutes
 */

import { Worker, Job, Queue } from 'bullmq';
import { QUEUE_NAMES, queueConnection, getQueue } from '../lib/queue';
import { baselinkerService } from '../services/baselinker.service';
import { prisma } from '../db';
import { BaselinkerSyncStatus, BaselinkerSyncType } from '@prisma/client';

// ============================================
// Types
// ============================================

interface BaselinkerSyncJobData {
  type: 'full-sync' | 'stock-sync' | 'categories-sync' | 'products-sync' | 'images-sync' | 'reindex';
  triggeredBy?: 'schedule' | 'manual';
  syncLogId?: string;
}

// ============================================
// Queue Instance
// ============================================

export const baselinkerSyncQueue = getQueue(QUEUE_NAMES.BASELINKER_SYNC);

// ============================================
// Job Handlers
// ============================================

/**
 * Handle full sync job
 */
async function handleFullSync(job: Job<BaselinkerSyncJobData>): Promise<void> {
  console.log('[BaselinkerWorker] Starting full sync...');
  
  const syncLog = await prisma.baselinkerSyncLog.create({
    data: {
      type: BaselinkerSyncType.PRODUCTS,
      status: BaselinkerSyncStatus.RUNNING,
    },
  });

  try {
    const stored = await baselinkerService.getDecryptedToken();
    if (!stored) {
      throw new Error('No Baselinker configuration found');
    }

    const provider = await (baselinkerService as any).createProvider();
    let totalProcessed = 0;
    const allErrors: string[] = [];

    // 1. Sync categories
    await job.updateProgress(10);
    console.log('[BaselinkerWorker] Syncing categories...');
    const catResult = await baselinkerService.syncCategories(provider, stored.inventoryId);
    totalProcessed += catResult.processed;
    allErrors.push(...catResult.errors);

    // 2. Sync products
    await job.updateProgress(30);
    console.log('[BaselinkerWorker] Syncing products...');
    const prodResult = await baselinkerService.syncProducts(provider, stored.inventoryId);
    totalProcessed += prodResult.processed;
    allErrors.push(...prodResult.errors);

    // 3. Sync stock
    await job.updateProgress(70);
    console.log('[BaselinkerWorker] Syncing stock...');
    const stockResult = await baselinkerService.syncStock(provider, stored.inventoryId);
    totalProcessed += stockResult.processed;
    allErrors.push(...stockResult.errors);

    // 4. Reindex Meilisearch
    await job.updateProgress(90);
    console.log('[BaselinkerWorker] Reindexing Meilisearch...');
    await baselinkerService.reindexMeilisearch();

    // Update sync log
    await prisma.baselinkerSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: allErrors.length > 0 ? BaselinkerSyncStatus.FAILED : BaselinkerSyncStatus.SUCCESS,
        itemsProcessed: totalProcessed,
        errors: allErrors.length > 0 ? allErrors : undefined,
        completedAt: new Date(),
      },
    });

    // Update last sync time
    await prisma.baselinkerConfig.updateMany({
      data: { lastSyncAt: new Date() },
    });

    await job.updateProgress(100);
    console.log(`[BaselinkerWorker] Full sync completed. Processed: ${totalProcessed}, Errors: ${allErrors.length}`);
  } catch (error) {
    console.error('[BaselinkerWorker] Full sync failed:', error);
    
    await prisma.baselinkerSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: BaselinkerSyncStatus.FAILED,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Handle stock-only sync job
 */
async function handleStockSync(job: Job<BaselinkerSyncJobData>): Promise<void> {
  console.log('[BaselinkerWorker] Starting stock sync...');
  
  const syncLog = await prisma.baselinkerSyncLog.create({
    data: {
      type: BaselinkerSyncType.STOCK,
      status: BaselinkerSyncStatus.RUNNING,
    },
  });

  try {
    const stored = await baselinkerService.getDecryptedToken();
    if (!stored) {
      throw new Error('No Baselinker configuration found');
    }

    const provider = await (baselinkerService as any).createProvider();
    
    await job.updateProgress(20);
    const result = await baselinkerService.syncStock(provider, stored.inventoryId);

    await prisma.baselinkerSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: result.errors.length > 0 ? BaselinkerSyncStatus.FAILED : BaselinkerSyncStatus.SUCCESS,
        itemsProcessed: result.processed,
        errors: result.errors.length > 0 ? result.errors : undefined,
        completedAt: new Date(),
      },
    });

    await job.updateProgress(100);
    console.log(`[BaselinkerWorker] Stock sync completed. Processed: ${result.processed}`);
  } catch (error) {
    console.error('[BaselinkerWorker] Stock sync failed:', error);
    
    await prisma.baselinkerSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: BaselinkerSyncStatus.FAILED,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Handle Meilisearch reindex job
 */
async function handleReindex(job: Job<BaselinkerSyncJobData>): Promise<void> {
  console.log('[BaselinkerWorker] Starting Meilisearch reindex...');
  
  try {
    await baselinkerService.reindexMeilisearch();
    console.log('[BaselinkerWorker] Meilisearch reindex completed');
  } catch (error) {
    console.error('[BaselinkerWorker] Meilisearch reindex failed:', error);
    throw error;
  }
}

// ============================================
// Worker Instance
// ============================================

let worker: Worker<BaselinkerSyncJobData> | null = null;

/**
 * Start the Baselinker sync worker
 */
export function startBaselinkerSyncWorker(): Worker<BaselinkerSyncJobData> {
  if (worker) {
    return worker;
  }

  worker = new Worker<BaselinkerSyncJobData>(
    QUEUE_NAMES.BASELINKER_SYNC,
    async (job: Job<BaselinkerSyncJobData>) => {
      console.log(`[BaselinkerWorker] Processing job: ${job.name} (${job.data.type})`);

      switch (job.data.type) {
        case 'full-sync':
          await handleFullSync(job);
          break;
        case 'stock-sync':
          await handleStockSync(job);
          break;
        case 'reindex':
          await handleReindex(job);
          break;
        case 'categories-sync':
        case 'products-sync':
        case 'images-sync':
          // These can be triggered individually if needed
          console.log(`[BaselinkerWorker] Individual sync type: ${job.data.type}`);
          break;
        default:
          console.warn(`[BaselinkerWorker] Unknown job type: ${job.data.type}`);
      }
    },
    {
      connection: queueConnection,
      concurrency: 1, // Only one sync at a time
      limiter: {
        max: 1,
        duration: 60000, // Max 1 job per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BaselinkerWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BaselinkerWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[BaselinkerWorker] Worker error:', err);
  });

  console.log('[BaselinkerWorker] Worker started');
  return worker;
}

/**
 * Stop the worker
 */
export async function stopBaselinkerSyncWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[BaselinkerWorker] Worker stopped');
  }
}

// ============================================
// Scheduled Jobs
// ============================================

/**
 * Schedule recurring sync jobs
 * Call this during application startup
 */
export async function scheduleBaselinkerSync(): Promise<void> {
  // Check if Baselinker is configured
  const config = await prisma.baselinkerConfig.findFirst();
  
  if (!config || !config.syncEnabled) {
    console.log('[BaselinkerWorker] Sync disabled or not configured, skipping schedule');
    return;
  }

  // Remove existing repeatable jobs
  const repeatableJobs = await baselinkerSyncQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await baselinkerSyncQueue.removeRepeatableByKey(job.key);
  }

  // Schedule full sync based on config interval
  await baselinkerSyncQueue.add(
    'scheduled-full-sync',
    { type: 'full-sync', triggeredBy: 'schedule' },
    {
      repeat: {
        every: config.syncIntervalMinutes * 60 * 1000, // Convert to ms
      },
      jobId: 'baselinker-full-sync',
    }
  );

  // Schedule stock sync every 15 minutes
  await baselinkerSyncQueue.add(
    'scheduled-stock-sync',
    { type: 'stock-sync', triggeredBy: 'schedule' },
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
      jobId: 'baselinker-stock-sync',
    }
  );

  console.log(`[BaselinkerWorker] Scheduled syncs: full every ${config.syncIntervalMinutes}min, stock every 15min`);
}

// ============================================
// Queue Helper Functions
// ============================================

/**
 * Queue a manual full sync
 */
export async function queueBaselinkerFullSync(): Promise<string> {
  const job = await baselinkerSyncQueue.add(
    'manual-full-sync',
    { type: 'full-sync', triggeredBy: 'manual' },
    {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    }
  );
  return job.id!;
}

/**
 * Queue a manual stock sync
 */
export async function queueBaselinkerStockSync(): Promise<string> {
  const job = await baselinkerSyncQueue.add(
    'manual-stock-sync',
    { type: 'stock-sync', triggeredBy: 'manual' },
    {
      priority: 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30 seconds
      },
    }
  );
  return job.id!;
}

/**
 * Queue a Meilisearch reindex
 */
export async function queueBaselinkerReindex(): Promise<string> {
  const job = await baselinkerSyncQueue.add(
    'manual-reindex',
    { type: 'reindex', triggeredBy: 'manual' },
    {
      priority: 3,
    }
  );
  return job.id!;
}

/**
 * Get current queue status
 */
export async function getBaselinkerQueueStatus(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    baselinkerSyncQueue.getWaitingCount(),
    baselinkerSyncQueue.getActiveCount(),
    baselinkerSyncQueue.getCompletedCount(),
    baselinkerSyncQueue.getFailedCount(),
    baselinkerSyncQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}
