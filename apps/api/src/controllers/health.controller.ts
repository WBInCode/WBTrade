/**
 * Health Check Controller
 * Provides health check and readiness endpoints for monitoring
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { getRedisClient } from '../lib/redis';
import { meiliClient } from '../lib/meilisearch';
import { getAllQueueStats } from '../lib/queue';
import { getCacheStats } from '../lib/cache';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    meilisearch: ComponentHealth;
    queues: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

const startTime = Date.now();

/**
 * Check database health
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const redis = getRedisClient();
    await redis.ping();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

/**
 * Check Meilisearch health
 */
async function checkMeilisearch(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const health = await meiliClient.health();
    return {
      status: health.status === 'available' ? 'healthy' : 'unhealthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Meilisearch connection failed',
    };
  }
}

/**
 * Check queue health
 */
async function checkQueues(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const stats = await getAllQueueStats();
    const totalFailed = stats.reduce((sum, q) => sum + q.failed, 0);
    const totalActive = stats.reduce((sum, q) => sum + q.active, 0);
    
    return {
      status: 'healthy',
      latency: Date.now() - start,
      details: {
        queues: stats.length,
        activeJobs: totalActive,
        failedJobs: totalFailed,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Queue check failed',
    };
  }
}

/**
 * Get overall health status
 */
export async function getHealthStatus(req: Request, res: Response): Promise<void> {
  const [database, redis, meilisearch, queues] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMeilisearch(),
    checkQueues(),
  ]);

  const allHealthy = [database, redis, meilisearch, queues].every(c => c.status === 'healthy');
  const allUnhealthy = [database, redis].every(c => c.status === 'unhealthy');

  const health: HealthStatus = {
    status: allUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database,
      redis,
      meilisearch,
      queues,
    },
  };

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
}

/**
 * Simple liveness probe (for Kubernetes)
 */
export async function liveness(req: Request, res: Response): Promise<void> {
  res.status(200).json({ status: 'ok' });
}

/**
 * Readiness probe (for Kubernetes)
 * Checks if app is ready to receive traffic
 */
export async function readiness(req: Request, res: Response): Promise<void> {
  try {
    // Check essential services
    await prisma.$queryRaw`SELECT 1`;
    const redis = getRedisClient();
    await redis.ping();
    
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      message: error instanceof Error ? error.message : 'Service not ready',
    });
  }
}

/**
 * Get detailed metrics
 */
export async function getMetrics(req: Request, res: Response): Promise<void> {
  try {
    const [queueStats, cacheStats] = await Promise.all([
      getAllQueueStats(),
      getCacheStats(),
    ]);

    // Get database counts
    const [productCount, orderCount, userCount] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: process.memoryUsage(),
      database: {
        products: productCount,
        orders: orderCount,
        users: userCount,
      },
      cache: cacheStats,
      queues: queueStats,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get metrics' 
    });
  }
}

/**
 * Prometheus-compatible metrics endpoint
 */
export async function prometheusMetrics(req: Request, res: Response): Promise<void> {
  try {
    const [queueStats, cacheStats] = await Promise.all([
      getAllQueueStats(),
      getCacheStats(),
    ]);

    const [productCount, orderCount, userCount] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
    ]);

    const memory = process.memoryUsage();
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Build Prometheus format metrics
    let metrics = '';

    // Uptime
    metrics += '# HELP wbtrade_uptime_seconds Application uptime in seconds\n';
    metrics += '# TYPE wbtrade_uptime_seconds counter\n';
    metrics += `wbtrade_uptime_seconds ${uptime}\n\n`;

    // Memory
    metrics += '# HELP wbtrade_memory_bytes Memory usage in bytes\n';
    metrics += '# TYPE wbtrade_memory_bytes gauge\n';
    metrics += `wbtrade_memory_bytes{type="heapUsed"} ${memory.heapUsed}\n`;
    metrics += `wbtrade_memory_bytes{type="heapTotal"} ${memory.heapTotal}\n`;
    metrics += `wbtrade_memory_bytes{type="rss"} ${memory.rss}\n\n`;

    // Database counts
    metrics += '# HELP wbtrade_database_records Total records in database\n';
    metrics += '# TYPE wbtrade_database_records gauge\n';
    metrics += `wbtrade_database_records{table="products"} ${productCount}\n`;
    metrics += `wbtrade_database_records{table="orders"} ${orderCount}\n`;
    metrics += `wbtrade_database_records{table="users"} ${userCount}\n\n`;

    // Cache keys
    metrics += '# HELP wbtrade_cache_keys Number of cached keys\n';
    metrics += '# TYPE wbtrade_cache_keys gauge\n';
    metrics += `wbtrade_cache_keys{type="products"} ${cacheStats.productKeys}\n`;
    metrics += `wbtrade_cache_keys{type="inventory"} ${cacheStats.inventoryKeys}\n`;
    metrics += `wbtrade_cache_keys{type="categories"} ${cacheStats.categoryKeys}\n`;
    metrics += `wbtrade_cache_keys{type="sessions"} ${cacheStats.sessionKeys}\n\n`;

    // Queue stats
    metrics += '# HELP wbtrade_queue_jobs Jobs in queues\n';
    metrics += '# TYPE wbtrade_queue_jobs gauge\n';
    for (const queue of queueStats) {
      metrics += `wbtrade_queue_jobs{queue="${queue.name}",status="waiting"} ${queue.waiting}\n`;
      metrics += `wbtrade_queue_jobs{queue="${queue.name}",status="active"} ${queue.active}\n`;
      metrics += `wbtrade_queue_jobs{queue="${queue.name}",status="completed"} ${queue.completed}\n`;
      metrics += `wbtrade_queue_jobs{queue="${queue.name}",status="failed"} ${queue.failed}\n`;
    }

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).send(`# Error generating metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
