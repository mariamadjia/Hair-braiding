import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/Gallery/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/Gallery/:path*',
        destination: `${API_URL}/Gallery/:path*`,
      },
    ];
  },
};

export default nextConfig;
