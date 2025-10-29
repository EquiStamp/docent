/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/sample',
        destination:
          'https://docent.transluce.org/dashboard/8831255a-249e-46cc-a600-c27c3d3cbd28?rubricId=e32d434f-168b-4708-af77-095a936ccaf0',
        permanent: false,
      },
      {
        source: '/(.*)',
        has: [
          {
            type: 'host',
            value: 'docent-alpha.transluce.org',
          },
        ],
        destination: 'https://docent.transluce.org/$1',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Proxy API requests to backend on port 8888
    // This allows frontend (port 3000) and backend (port 8888) to appear on same origin
    const internalApiHost = process.env.NEXT_PUBLIC_INTERNAL_API_HOST;
    if (internalApiHost) {
      return [
        {
          source: '/rest/:path*',
          destination: `${internalApiHost}/rest/:path*`,
        },
      ];
    }
    return [];
  },
  // Enable standalone output for Docker production builds
  output: 'standalone',
};

export default nextConfig;
