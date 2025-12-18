/**
 * Search Index Worker
 * Processes Meilisearch indexing jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES } from '../lib/queue';
import { SearchService } from '../services/search.service';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

const searchService = new SearchService();

// Job types
interface IndexProductJob {
  productId: string;
}

interface DeleteProductJob {
  productId: string;
}

/**
 * Create and start the search index worker
 */
export function startSearchIndexWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.SEARCH_INDEX,
    async (job: Job) => {
      console.log(`[SearchWorker] Processing job: ${job.name} (${job.id})`);

      switch (job.name) {
        case 'index-product': {
          const { productId } = job.data as IndexProductJob;
          await searchService.indexProduct(productId);
          console.log(`[SearchWorker] Indexed product: ${productId}`);
          break;
        }

        case 'reindex-all': {
          console.log('[SearchWorker] Starting full reindex...');
          const result = await searchService.indexAllProducts();
          console.log(`[SearchWorker] Reindex complete: ${result.indexed} products indexed`);
          return result;
        }

        case 'delete-product': {
          const { productId } = job.data as DeleteProductJob;
          await searchService.deleteProduct(productId);
          console.log(`[SearchWorker] Deleted product from index: ${productId}`);
          break;
        }

        default:
          console.warn(`[SearchWorker] Unknown job type: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );

  worker.on('completed', (job) => {
    console.log(`[SearchWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SearchWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[SearchWorker] Worker error:', err);
  });

  console.log('✓ Search index worker started');
  return worker;
}
