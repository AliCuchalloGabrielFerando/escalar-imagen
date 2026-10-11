/**
 * LAYER: Infrastructure
 * Contains: Web Worker message contract
 * Rules: Shared types between the main thread adapter and the worker.
 */

/** Execution provider the worker is actually using. */
export type UpscaleBackend = 'webgpu' | 'wasm'

export interface UpscaleWorkerRequest {
  id: string
  modelUrl: string
  width: number
  height: number
  /** RGBA pixels, transferable. */
  rgba: ArrayBuffer
  tileSize: number
  tilePadding: number
  denoiseWeight: number
}

export type UpscaleWorkerResponse =
  | { type: 'progress'; id: string; ratio: number; message: string }
  | {
      type: 'backend'
      id: string
      /** Provider actually engaged after fallback resolution. */
      backend: UpscaleBackend
      /** Providers requested, in preference order. */
      requested: string[]
      /** Whether the browser exposed `navigator.gpu`. */
      webgpuApi: boolean
    }
  | { type: 'done'; id: string; width: number; height: number; rgba: ArrayBuffer }
  | { type: 'error'; id: string; message: string }
