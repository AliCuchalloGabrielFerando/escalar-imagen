/**
 * LAYER: Infrastructure
 * Contains: CanvasImageCodec (ImageCodec implementation)
 * Rules: Implements an Application port using browser Canvas APIs.
 */
import type { ImageCodec } from '@/application/ports/image-codec.port'
import { RgbaImage } from '@/domain/value-objects/rgba-image.vo'

export class CanvasImageCodec implements ImageCodec {
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

  async encode(image: RgbaImage, type = 'image/png'): Promise<Blob> {
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

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
        type,
      )
    })
  }
}
