/**
 * LAYER: Application
 * Contains: ImageUpscaler Port
 * Rules: Contract only. Implemented by Infrastructure (ONNX + Web Worker).
 */
import type { RgbaImage } from '@/domain/value-objects/rgba-image.vo'
import type { UpscaleOptions } from '@/domain/value-objects/upscale-options.vo'

export interface UpscaleProgress {
  /** Normalized progress in [0, 1]. */
  ratio: number
  message: string
}

/** Which compute backend ended up running the model, after fallback. */
export interface UpscaleBackendInfo {
  backend: 'webgpu' | 'wasm'
  /** Providers requested, in preference order. */
  requested: readonly string[]
  /** Whether the browser exposed `navigator.gpu`. */
  webgpuApi: boolean
}

export interface ImageUpscaler {
  upscale(
    image: RgbaImage,
    options: UpscaleOptions,
    onProgress?: (progress: UpscaleProgress) => void,
    onBackend?: (info: UpscaleBackendInfo) => void,
  ): Promise<RgbaImage>
}
