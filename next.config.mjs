/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/wallet/:path*',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/exchange/:path*',
        destination: '/dashboard',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
