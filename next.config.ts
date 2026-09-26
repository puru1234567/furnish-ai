import type { NextConfig } from "next";

// Fix for corporate proxy SSL inspection (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)
// NODE_TLS_REJECT_UNAUTHORIZED must be set at process level, not via .env.local
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
