/**
 * LAYER: Application
 * Contains: ImageCodec Port
 * Rules: Contract only. Decodes/encodes images (implemented with Canvas in Infrastructure).
 */
import type { RgbaImage } from '@/domain/value-objects/rgba-image.vo'

export type OutputFormat = 'png' | 'jpeg' | 'webp'

/** Static metadata for an output format. */
export interface FormatMeta {
  format: OutputFormat
  mimeType: string
  extension: string
  label: string
  /** Whether the format can represent transparency. */
  supportsAlpha: boolean
  /** Whether the format is lossy (accepts a quality setting). */
  lossy: boolean
}

/**
 * Native output formats we offer.
 *
 * AVIF and JPEG XL are intentionally excluded: no major browser can *encode*
 * them from a canvas (Chrome/Firefox silently fall back to PNG for AVIF, and
 * Chrome removed JPEG XL in M110). They would require a WASM encoder (v2).
 */
export const OUTPUT_FORMATS: readonly FormatMeta[] = [
  { format: 'png', mimeType: 'image/png', extension: 'png', label: 'PNG', supportsAlpha: true, lossy: false },
  { format: 'jpeg', mimeType: 'image/jpeg', extension: 'jpg', label: 'JPEG', supportsAlpha: false, lossy: true },
  { format: 'webp', mimeType: 'image/webp', extension: 'webp', label: 'WebP', supportsAlpha: true, lossy: true },
]

export interface EncodeOptions {
  format: OutputFormat
  /** 0-1. Only used by lossy formats (JPEG/WebP). Defaults to 0.9. */
  quality?: number
}

export interface FormatCapability extends FormatMeta {
  /** True only if the browser really encodes this MIME (`blob.type === mimeType`). */
  encodable: boolean
}

export interface ImageCodec {
  /** Decode a file/blob into raw RGBA pixels. */
  decode(file: Blob): Promise<RgbaImage>
  /** Encode raw RGBA pixels into a downloadable blob. */
  encode(image: RgbaImage, options: EncodeOptions): Promise<Blob>
  /** Real encoding capabilities of the current browser, measured at runtime. */
  getCapabilities(): Promise<FormatCapability[]>
}
