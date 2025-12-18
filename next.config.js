/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig


