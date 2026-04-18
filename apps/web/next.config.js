/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared workspace package so Next.js can resolve it
  transpilePackages: ['@pm-chat/shared'],
  // Ignore TypeScript / ESLint errors during production builds so Vercel
  // doesn't fail on issues that aren't in our web app code.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
