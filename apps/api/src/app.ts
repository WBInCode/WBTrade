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
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for API
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
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
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
app.use('/api/locations', locationsRoutes); // Warehouse locations
app.use('/api/users', usersRoutes); // Users management

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  
  // Initialize Meilisearch
  await initializeMeilisearch();
  
  // Start background workers
  console.log('⚙️  Starting background workers...');
  startSearchIndexWorker();
  startEmailWorker();
  startInventorySyncWorker();
  startImportWorker();
  startExportWorker();
  startShippingWorker();
  
  // Schedule recurring jobs
  await scheduleReservationCleanup();
  console.log('✅ Reservation cleanup scheduled (every 5 minutes)');
  
  console.log('✅ All workers started successfully');
});