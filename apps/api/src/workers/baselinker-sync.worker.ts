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
  
  // Check if config exists before creating sync log
  const stored = await baselinkerService.getDecryptedToken();
  if (!stored) {
    console.log('[BaselinkerWorker] No Baselinker configuration found, skipping sync');
    return;
  }

  const syncLog = await prisma.baselinkerSyncLog.create({
    data: {
      type: BaselinkerSyncType.PRODUCTS,
      status: BaselinkerSyncStatus.RUNNING,
    },
  });

  try {
    const provider = await (baselinkerService as any).createProvider();
    let totalProcessed = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    // 1. Sync categories (incremental)
    await job.updateProgress(10);
    console.log('[BaselinkerWorker] Syncing categories (incremental)...');
    const catResult = await baselinkerService.syncCategories(provider, stored.inventoryId);
    totalProcessed += catResult.processed;
    totalSkipped += catResult.skipped || 0;
    allErrors.push(...catResult.errors);
    console.log(`[BaselinkerWorker] Categories: ${catResult.processed} updated, ${catResult.skipped || 0} unchanged`);

    // 2. Sync products (incremental)
    await job.updateProgress(30);
    console.log('[BaselinkerWorker] Syncing products (incremental)...');
    const prodResult = await baselinkerService.syncProducts(provider, stored.inventoryId);
    totalProcessed += prodResult.processed;
    totalSkipped += prodResult.skipped || 0;
    allErrors.push(...prodResult.errors);
    console.log(`[BaselinkerWorker] Products: ${prodResult.processed} updated, ${prodResult.skipped || 0} unchanged`);

    // 3. Sync stock
    await job.updateProgress(70);
    console.log('[BaselinkerWorker] Syncing stock...');
    const stockResult = await baselinkerService.syncStock(provider, stored.inventoryId);
    totalProcessed += stockResult.processed;
    allErrors.push(...stockResult.errors);

    // 4. Reindex Meilisearch (only if something changed)
    await job.updateProgress(90);
    if (totalProcessed > 0) {
      console.log('[BaselinkerWorker] Reindexing Meilisearch...');
      await baselinkerService.reindexMeilisearch();
    } else {
      console.log('[BaselinkerWorker] No changes, skipping Meilisearch reindex');
    }

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
    console.log(`[BaselinkerWorker] Full sync completed. Updated: ${totalProcessed}, Unchanged: ${totalSkipped}, Errors: ${allErrors.length}`);
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
  
  // Check if config exists before creating sync log
  const stored = await baselinkerService.getDecryptedToken();
  if (!stored) {
    console.log('[BaselinkerWorker] No Baselinker configuration found, skipping stock sync');
    return;
  }

  const syncLog = await prisma.baselinkerSyncLog.create({
    data: {
      type: BaselinkerSyncType.STOCK,
      status: BaselinkerSyncStatus.RUNNING,
    },
  });

  try {
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
 * Minimum time between syncs at startup (5 minutes)
 * Prevents running expensive full sync on every server restart
 */
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Check if enough time has passed since last sync
 */
async function shouldRunScheduledSync(): Promise<boolean> {
  const config = await prisma.baselinkerConfig.findFirst();
  
  if (!config?.lastSyncAt) {
    return true; // Never synced, should run
  }
  
  const timeSinceLastSync = Date.now() - config.lastSyncAt.getTime();
  return timeSinceLastSync >= MIN_SYNC_INTERVAL_MS;
}

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

  // Check if we should delay the first sync
  const shouldSync = await shouldRunScheduledSync();
  
  if (!shouldSync) {
    const lastSync = config.lastSyncAt ? new Date(config.lastSyncAt).toISOString() : 'never';
    console.log(`[BaselinkerWorker] Last sync was at ${lastSync}, skipping immediate sync - will run on schedule`);
  }

  // Get stock sync interval (with fallback for existing configs)
  const stockSyncInterval = (config as any).stockSyncIntervalMinutes || 60; // 1 hour default
  
  // Schedule full sync (default: every 24 hours)
  await baselinkerSyncQueue.add(
    'scheduled-full-sync',
    { type: 'full-sync', triggeredBy: 'schedule' },
    {
      repeat: {
        every: config.syncIntervalMinutes * 60 * 1000, // Convert to ms
        immediately: shouldSync, // Only run immediately if we should sync
      },
      jobId: 'baselinker-full-sync',
    }
  );

  // Schedule stock sync (default: every 1 hour)
  await baselinkerSyncQueue.add(
    'scheduled-stock-sync',
    { type: 'stock-sync', triggeredBy: 'schedule' },
    {
      repeat: {
        every: stockSyncInterval * 60 * 1000, // Convert to ms
        immediately: shouldSync, // Only run immediately if we should sync
      },
      jobId: 'baselinker-stock-sync',
    }
  );

  console.log(`[BaselinkerWorker] Scheduled syncs: full every ${config.syncIntervalMinutes}min, stock every ${stockSyncInterval}min${!shouldSync ? ' (waiting for schedule)' : ''}`);
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
