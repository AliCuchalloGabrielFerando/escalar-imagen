/**
 * LAYER: Infrastructure
 * Contains: WebGPU capability detection
 * Rules: Technical/browser capability probe. No domain logic.
 *
 * IMPORTANT: OnnxRuntime Web's WebGPU execution provider currently only works
 * on Chromium-based browsers (Chrome/Edge). Safari and Firefox may expose the
 * `navigator.gpu` API but ORT Web will not use it. We therefore treat WebGPU as
 * "available" when the API exists, and always keep WASM as a fallback.
 */

export interface WebGpuSupport {
  /** `navigator.gpu` exists (necessary, not sufficient for ORT Web). */
  apiAvailable: boolean
  /** Human-readable reason when the API is missing. */
  reason?: string
}

/**
 * Minimal shape of the WebGPU entry point. Typed locally to avoid depending on
 * `@webgpu/types` (the TS DOM lib of this project does not declare `navigator.gpu`).
 */
interface GpuNavigator {
  gpu?: {
    requestAdapter: (options?: unknown) => Promise<unknown | null>
  }
}

function getGpu(): GpuNavigator['gpu'] | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & GpuNavigator).gpu
}

/** Synchronous presence check — cheap, safe to call on the main thread. */
export function detectWebGpuSupport(): WebGpuSupport {
  if (typeof navigator === 'undefined') {
    return { apiAvailable: false, reason: 'No navigator (non-browser environment)' }
  }
  if (!getGpu()) {
    return { apiAvailable: false, reason: 'navigator.gpu no está disponible' }
  }
  return { apiAvailable: true }
}

/**
 * Stronger probe: verifies that an adapter can actually be acquired.
 * This is async and may fail on machines with a blocklisted GPU.
 * Safe to call from a Worker (WebGPU is available in dedicated workers).
 */
export async function canAcquireWebGpuAdapter(): Promise<boolean> {
  const gpu = getGpu()
  if (!gpu) return false
  try {
    const adapter = await gpu.requestAdapter()
    return adapter != null
  } catch {
    return false
  }
}
