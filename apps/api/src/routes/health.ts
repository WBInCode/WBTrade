/**
 * Health Check Routes
 */

import { Router } from 'express';
import {
  getHealthStatus,
  liveness,
  readiness,
  getMetrics,
  prometheusMetrics,
} from '../controllers/health.controller';

const router = Router();

// Health check endpoint (detailed)
router.get('/', getHealthStatus);

// Kubernetes probes
router.get('/live', liveness);
router.get('/ready', readiness);

// Metrics endpoints
router.get('/metrics', getMetrics);
router.get('/metrics/prometheus', prometheusMetrics);

export default router;
