/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    
    // Image optimization configuration
    images: {
        domains: ['images.unsplash.com', 'img.logo.dev'],
        // Remote patterns for production CDN
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'img.logo.dev',
            },
            {
                protocol: 'https',
                hostname: 'storage.wbtrade.pl',
            },
            {
                protocol: 'https',
                hostname: '*.cloudfront.net',
            },
            {
                protocol: 'https',
                hostname: '*.r2.cloudflarestorage.com',
            },
            // Supplier image sources
            {
                protocol: 'https',
                hostname: 'www.hurtowniaprzemyslowa.pl',
            },
            {
                protocol: 'https',
                hostname: 'hurtowniaprzemyslowa.pl',
            },
        ],
        // Image optimization settings
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60 * 60 * 24, // 24 hours
    },
    
    // Environment variables
    env: {
        API_URL: process.env.API_URL || 'http://localhost:5000/api',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    },
    
    // Experimental features for better performance
    experimental: {
        // Enable optimized package imports
        optimizePackageImports: ['lucide-react', '@headlessui/react'],
    },
    
    // Compiler optimizations
    compiler: {
        // Remove console.logs in production
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
    
    // Enable gzip compression
    compress: true,
    
    // Power prefetching for production
    productionBrowserSourceMaps: false,
    
    // Headers for caching
    async headers() {
        return [
            {
                // Cache static assets for 1 year
                source: '/images/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // Cache fonts
                source: '/fonts/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    
    // Webpack configuration
    webpack: (config) => {
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });
        return config;
    },
    
    // Logging for ISR
    logging: {
        fetches: {
            fullUrl: process.env.NODE_ENV === 'development',
        },
    },
};