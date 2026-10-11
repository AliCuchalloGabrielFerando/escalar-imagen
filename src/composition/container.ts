/**
 * LAYER: Composition Root
 * Contains: Wiring of use cases with infrastructure implementations.
 * Rules: The only place allowed to know concrete implementations.
 */
import type { ImageCodec } from '@/application/ports/image-codec.port'
import { UpscaleImageUseCase } from '@/application/use-cases/upscale-image.use-case'
import { CanvasImageCodec } from '@/infrastructure/image/canvas-image-codec'
import { WorkerImageUpscaler } from '@/infrastructure/onnx/worker-image-upscaler'
import { PerformanceClock } from '@/infrastructure/system/performance-clock'

export function createUpscaleImageUseCase(modelUrl?: string): UpscaleImageUseCase {
  return new UpscaleImageUseCase(new WorkerImageUpscaler(modelUrl), new PerformanceClock())
}

export function createImageCodec(): ImageCodec {
  return new CanvasImageCodec()
}

// Re-exported for the Interface layer so it never imports Domain/Infrastructure directly.
export { DEFAULT_MODEL_URL } from '@/infrastructure/onnx/model'
export {
  detectWebGpuSupport,
  canAcquireWebGpuAdapter,
} from '@/infrastructure/onnx/webgpu-support'
export type { WebGpuSupport } from '@/infrastructure/onnx/webgpu-support'
export { UpscaleOptions } from '@/domain/value-objects/upscale-options.vo'
export type { UpscaleOptionsProps } from '@/domain/value-objects/upscale-options.vo'
export { OUTPUT_FORMATS } from '@/application/ports/image-codec.port'
export type {
  EncodeOptions,
  FormatCapability,
  ImageCodec,
  OutputFormat,
} from '@/application/ports/image-codec.port'
export type { RgbaImage } from '@/domain/value-objects/rgba-image.vo'
