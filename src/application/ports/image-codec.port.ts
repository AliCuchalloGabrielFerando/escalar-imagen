/**
 * LAYER: Application
 * Contains: ImageCodec Port
 * Rules: Contract only. Decodes/encodes images (implemented with Canvas in Infrastructure).
 */
import type { RgbaImage } from '@/domain/value-objects/rgba-image.vo'

export interface ImageCodec {
  /** Decode a file/blob into raw RGBA pixels. */
  decode(file: Blob): Promise<RgbaImage>
  /** Encode raw RGBA pixels into a downloadable blob. */
  encode(image: RgbaImage, type?: string): Promise<Blob>
}
