/**
 * LAYER: Infrastructure
 * Contains: CanvasImageCodec (ImageCodec implementation)
 * Rules: Implements an Application port using browser Canvas APIs.
 */
import type {
  EncodeOptions,
  FormatCapability,
  ImageCodec,
} from '@/application/ports/image-codec.port'
import { OUTPUT_FORMATS } from '@/application/ports/image-codec.port'
import { RgbaImage } from '@/domain/value-objects/rgba-image.vo'

/**
 * WebP at quality 1.0 silently switches to lossless (files ~3.5x larger).
 * Clamp below 1.0 unless the user explicitly wants lossless (not exposed yet).
 */
const MAX_LOSSY_QUALITY = 0.99
const DEFAULT_LOSSY_QUALITY = 0.9

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function clampQuality(quality?: number): number {
  if (quality === undefined || Number.isNaN(quality)) return DEFAULT_LOSSY_QUALITY
  return Math.min(MAX_LOSSY_QUALITY, Math.max(0, quality))
}

export class CanvasImageCodec implements ImageCodec {
  private capabilities: FormatCapability[] | null = null

  async decode(file: Blob): Promise<RgbaImage> {
    const bitmap = await createImageBitmap(file)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Could not get a 2D canvas context')

      ctx.drawImage(bitmap, 0, 0)
      const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
      return RgbaImage.create(width, height, data)
    } finally {
      bitmap.close()
    }
  }

  async getCapabilities(): Promise<FormatCapability[]> {
    if (this.capabilities) return this.capabilities

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 2

    this.capabilities = await Promise.all(
      OUTPUT_FORMATS.map(async (meta) => {
        const blob = await toBlob(canvas, meta.mimeType, 0.8)
        // The spec returns PNG for unsupported types — never trust the request,
        // compare the actual blob type.
        return { ...meta, encodable: blob !== null && blob.type === meta.mimeType }
      }),
    )
    return this.capabilities
  }

  async encode(image: RgbaImage, options: EncodeOptions): Promise<Blob> {
    const meta = OUTPUT_FORMATS.find((format) => format.format === options.format)
    if (!meta) throw new Error(`Formato de salida desconocido: ${options.format}`)

    const capabilities = await this.getCapabilities()
    const capability = capabilities.find((entry) => entry.format === options.format)
    if (!capability?.encodable) {
      throw new Error(`Este navegador no puede codificar ${meta.label}`)
    }

    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context')

    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
      0,
      0,
    )

    const quality = meta.lossy ? clampQuality(options.quality) : undefined
    const blob = await toBlob(canvas, meta.mimeType, quality)
    if (!blob || blob.type !== meta.mimeType) {
      throw new Error(`Fallo al codificar ${meta.label} (se obtuvo ${blob?.type ?? 'nada'})`)
    }
    return blob
  }
}
