/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    // pdfjs-dist: exclude the canvas package (optional native dep)
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
