import path from 'node:path'
import type { NextConfig } from 'next'

/**
 * LAYER: Configuration (framework boundary)
 * Next.js config. The Web Worker is resolved by the bundler through
 * `new Worker(new URL('../workers/upscale.worker.ts', import.meta.url))`,
 * so no extra loader configuration is required.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Models are large (4.7 MB) and effectively immutable: let the browser
        // cache them for a year instead of revalidating on every load.
        // NOTE: if you replace a model file, rename it (or bump the URL) so
        // clients pick up the new version instead of the cached one.
        source: '/models/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Demo samples are static too.
        source: '/samples/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolve onnxruntime-web's WebGPU entry to the "extern wasm" build so
      // webpack does NOT emit the ~27 MB wasm binary into .next/static. The
      // worker loads it from the CDN at runtime via `ort.env.wasm.wasmPaths`.
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-web/webgpu': path.resolve(
          process.cwd(),
          'node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs',
        ),
      }
    }
    return config
  },
}

export default nextConfig
