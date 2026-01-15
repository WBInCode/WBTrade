// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env first
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also try local .env as fallback
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import productsRoutes from './routes/products';
import searchRoutes from './routes/search';
import ordersRoutes from './routes/orders';
import cartRoutes from './routes/cart';
import authSecureRoutes from './routes/auth.secure';
import inventoryRoutes from './routes/inventory';
import addressesRoutes from './routes/addresses';
import wishlistRoutes from './routes/wishlist';
import categoriesRoutes from './routes/categories';
import checkoutRoutes from './routes/checkout';
import dashboardRoutes from './routes/dashboard';
import adminDashboardRoutes from './routes/admin-dashboard';
import locationsRoutes from './routes/locations';
import usersRoutes from './routes/users';
import reviewsRoutes from './routes/reviews';
import healthRoutes from './routes/health';
import baselinkerRoutes from './routes/baselinker';
import reportsRoutes from './routes/reports';
import uploadRoutes from './routes/upload';
import { generalRateLimiter } from './middleware/rate-limit.middleware';
import { initializeMeilisearch } from './lib/meilisearch';
import { startSearchIndexWorker } from './workers/search-index.worker';
import { startEmailWorker } from './workers/email.worker';
import { startInventorySyncWorker } from './workers/inventory-sync.worker';
import { startImportWorker, startExportWorker } from './workers/import-export.worker';
import { startShippingWorker } from './workers/shipping.worker';
import { scheduleReservationCleanup } from './lib/queue';

const app = express();
const PORT = process.env.APP_PORT || 5000;

// Trust proxy for rate limiting behind reverse proxy (e.g. nginx)
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:5000'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for API
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded from other origins
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
// Note: Production domains should be configured via FRONTEND_URL environment variable
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

// Parse FRONTEND_URL if it's a comma-separated string
if (process.env.FRONTEND_URL) {
  const frontendUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  allowedOrigins.push(...frontendUrls);
}

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Session-Id', 'X-CSRF-Token'],
};

// Middleware
app.use(cors(corsOptions));

// Custom JSON parser that preserves raw body for webhook signature verification
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    // Store raw body for webhook signature verification
    // Only for webhook endpoints
    if (req.url?.includes('/webhooks/')) {
      req.rawBody = buf.toString('utf-8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to all routes
app.use(generalRateLimiter);

// Health check endpoint (skip rate limiter)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed health checks
app.use('/api/health', healthRoutes);

// Root endpoint - API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'WBTrade API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      search: '/api/search',
      orders: '/api/orders',
      cart: '/api/cart',
      inventory: '/api/inventory',
      addresses: '/api/addresses',
      wishlist: '/api/wishlist',
      dashboard: '/api/dashboard',
      health: '/health',
    },
    documentation: 'https://github.com/wbtrade/docs',
  });
});

// API Routes - Auth with enhanced security
app.use('/api/auth', authSecureRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/webhooks', checkoutRoutes); // Webhook routes
app.use('/api/admin/dashboard', adminDashboardRoutes); // Admin dashboard
app.use('/api/admin/baselinker', baselinkerRoutes); // Baselinker integration
app.use('/api/reports', reportsRoutes); // Reports
app.use('/api/locations', locationsRoutes); // Warehouse locations
app.use('/api/users', usersRoutes); // Users management
app.use('/api/upload', uploadRoutes); // File uploads

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Start the server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize Redis connection
  try {
    console.log('🔗 Initializing Redis connection...');
    const { getRedisClient } = await import('./lib/redis');
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      console.log('✅ Redis connection verified');
    } else {
      console.warn('⚠️  Redis unavailable - app will run without caching/workers');
    }
  } catch (error: any) {
    console.error('❌ Redis initialization failed:', error?.message || error);
    if (error?.message?.includes('max requests limit')) {
      console.warn('⚠️  Redis limit exceeded - app will run without caching/workers');
    } else if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
      console.error('💥 CRITICAL: REDIS_URL is not set in production!');
    }
    console.warn('⚠️  Application will continue but Redis-dependent features disabled');
  }
  
  // Initialize Meilisearch
  await initializeMeilisearch();
  
  // Start background workers - DISABLED due to Redis limit exceeded
  console.log('⚠️  Background workers disabled - Redis limit exceeded');
  console.log('ℹ️  Enable workers after upgrading Upstash Redis plan');
  
  // TODO: Re-enable after upgrading Redis
  /*
  console.log('⚙️  Starting background workers...');
  startSearchIndexWorker();
  startEmailWorker();
  startInventorySyncWorker();
  startImportWorker();
  startExportWorker();
  startShippingWorker();
  
  // Schedule recurring jobs with retry logic
  try {
    await scheduleReservationCleanup();
    console.log('✅ Reservation cleanup scheduled (every 5 minutes)');
  } catch (error) {
    console.error('⚠️  Failed to schedule reservation cleanup:', error);
    console.log('ℹ️  Will retry in background...');
    // Retry after 10 seconds
    setTimeout(async () => {
      try {
        await scheduleReservationCleanup();
        console.log('✅ Reservation cleanup scheduled (retry successful)');
      } catch (retryError) {
        console.error('❌ Reservation cleanup scheduling failed after retry:', retryError);
      }
    }, 10000);
  }
  */
  
  console.log('✅ Server started (workers disabled)');
  console.log('ℹ️  Baselinker sync: manual only (use admin panel)');
});