/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shorts/shared-types'],
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
