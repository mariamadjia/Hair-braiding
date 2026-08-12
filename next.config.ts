import type { NextConfig } from "next";

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-hairbraiding.onrender.com';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/admin',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  images: {
    // Next.js 16 blocks local image sources with query strings unless they
    // are explicitly allowed. The proxy route validates the upstream origin
    // and gallery path before fetching, so dynamic `?url=` values are safe
    // for this one local endpoint.
    localPatterns: [
      {
        pathname: '/api/gallery/image/**',
        search: '',
      },
      {
        pathname: '/api/proxy-image',
      },
      {
        pathname: '/hero/**',
        search: '',
      },
      {
        pathname: '/Gallery/**',
        search: '',
      },
      {
        pathname: '/uploads/**',
        search: '',
      },
      {
        pathname: '/images/**',
        search: '',
      },
      {
        pathname: '/contact/**',
        search: '',
      },
      {
        pathname: '/services/**',
        search: '',
      },
      {
        pathname: '/logo/**',
        search: '',
      },
    ],
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
        source: '/backend-api/:path*',
        destination: `${API_URL}/:path*`,
      },
      {
        source: '/api/gallery/image/:path*',
        destination: `${API_URL}/api/gallery/image/:path*`,
      },
    ];
  },
};

export default nextConfig;
