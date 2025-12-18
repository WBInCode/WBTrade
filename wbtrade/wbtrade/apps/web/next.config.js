module.exports = {
    reactStrictMode: true,
    images: {
        domains: ['images.unsplash.com'],
    },
    env: {
        API_URL: process.env.API_URL || 'http://localhost:3000/api',
    },
    webpack: (config) => {
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });
        return config;
    },
};