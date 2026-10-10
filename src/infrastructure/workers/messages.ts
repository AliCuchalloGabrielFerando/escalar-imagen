/**
 * LAYER: Infrastructure
 * Contains: Web Worker message contract
 * Rules: Shared types between the main thread adapter and the worker.
 */

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
  | { type: 'done'; id: string; width: number; height: number; rgba: ArrayBuffer }
  | { type: 'error'; id: string; message: string }
