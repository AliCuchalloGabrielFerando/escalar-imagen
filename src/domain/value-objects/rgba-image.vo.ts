/**
 * LAYER: Domain
 * Contains: RgbaImage Value Object
 * Rules: No external dependencies. Pure data + invariants.
 */

/**
 * Immutable-ish value object holding raw RGBA pixel data (4 channels).
 * Kept framework-free: it does not know about Canvas, ImageData or the DOM.
 */
export class RgbaImage {
  private constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly data: Uint8ClampedArray<ArrayBuffer>,
  ) {}

  static create(
    width: number,
    height: number,
    data: Uint8ClampedArray<ArrayBuffer>,
  ): RgbaImage {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error(`Invalid image dimensions: ${width}x${height}`)
    }

    const expected = width * height * 4
    if (data.length !== expected) {
      throw new Error(`RGBA data length mismatch: expected ${expected}, got ${data.length}`)
    }

    return new RgbaImage(width, height, data)
  }

  get pixelCount(): number {
    return this.width * this.height
  }
}
