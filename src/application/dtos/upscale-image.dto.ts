/**
 * LAYER: Application
 * Contains: UpscaleImage DTOs
 * Rules: Plain data structures. No behavior, no framework types.
 */
import type { RgbaImage } from '@/domain/value-objects/rgba-image.vo'
import type { UpscaleOptionsProps } from '@/domain/value-objects/upscale-options.vo'
import type { UpscaleProgress } from '../ports/image-upscaler.port'

export interface UpscaleImageInputDTO {
  image: RgbaImage
  options?: UpscaleOptionsProps
  onProgress?: (progress: UpscaleProgress) => void
}

export interface UpscaleImageOutputDTO {
  image: RgbaImage
  durationMs: number
}
