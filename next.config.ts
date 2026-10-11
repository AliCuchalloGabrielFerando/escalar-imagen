import type { NextConfig } from 'next'

/**
 * LAYER: Configuration (framework boundary)
 * Next.js config. The Web Worker is resolved by the bundler through
 * `new Worker(new URL('../workers/upscale.worker.ts', import.meta.url))`,
 * so no extra loader configuration is required.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
}

export default nextConfig
