/**
 * LAYER: Domain
 * Contains: UpscaleOptions Value Object
 * Rules: No external dependencies. Validates the upscaling parameters.
 */

export interface UpscaleOptionsProps {
  /** Edge size (px) of each input tile. Bigger = faster but more memory. */
  tileSize?: number
  /** Overlap (px) added around every tile to hide seams. */
  tilePadding?: number
  /** Denoise strength in [0, 1]. Only used when the model exposes a weight input. */
  denoiseWeight?: number
}

export class UpscaleOptions {
  static readonly DEFAULT_TILE_SIZE = 128
  static readonly DEFAULT_TILE_PADDING = 8
  static readonly DEFAULT_DENOISE_WEIGHT = 1

  private constructor(
    public readonly tileSize: number,
    public readonly tilePadding: number,
    public readonly denoiseWeight: number,
  ) {}

  static create(props: UpscaleOptionsProps = {}): UpscaleOptions {
    const tileSize = props.tileSize ?? UpscaleOptions.DEFAULT_TILE_SIZE
    const tilePadding = props.tilePadding ?? UpscaleOptions.DEFAULT_TILE_PADDING
    const denoiseWeight = props.denoiseWeight ?? UpscaleOptions.DEFAULT_DENOISE_WEIGHT

    if (!Number.isInteger(tileSize) || tileSize <= 0) {
      throw new Error(`tileSize must be a positive integer, got ${tileSize}`)
    }
    if (!Number.isInteger(tilePadding) || tilePadding < 0 || tilePadding >= tileSize) {
      throw new Error(`tilePadding must be an integer in [0, tileSize), got ${tilePadding}`)
    }
    if (Number.isNaN(denoiseWeight) || denoiseWeight < 0 || denoiseWeight > 1) {
      throw new Error(`denoiseWeight must be within [0, 1], got ${denoiseWeight}`)
    }

    return new UpscaleOptions(tileSize, tilePadding, denoiseWeight)
  }
}
