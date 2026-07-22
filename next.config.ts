import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-hairbraiding.onrender.com';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/Gallery/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/gallery/image/:path*',
        destination: `${API_URL}/api/gallery/image/:path*`,
      },
    ];
  },
};

export default nextConfig;
