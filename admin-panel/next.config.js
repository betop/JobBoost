// A Vercel deploy of the git branch "staging" targets the Xano "staging" branch by default (see src/config/xano.ts)
const xanoBranch = process.env.XANO_BRANCH || (process.env.VERCEL_GIT_COMMIT_REF === "staging" ? "staging" : "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose the Xano target to browser code (direct extension-file upload)
  env: {
    NEXT_PUBLIC_XANO_HOST: process.env.XANO_HOST || "",
    NEXT_PUBLIC_XANO_BRANCH: xanoBranch,
    NEXT_PUBLIC_XANO_DATA_SOURCE: process.env.XANO_DATA_SOURCE || "",
  },
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
