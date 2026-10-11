/**
 * LAYER: Application
 * Contains: UpscaleImage Use Case
 * Rules: Orchestrates the domain + ports. No business logic, no framework code.
 */
import { UpscaleOptions } from '@/domain/value-objects/upscale-options.vo'
import type { UpscaleImageInputDTO, UpscaleImageOutputDTO } from '../dtos/upscale-image.dto'
import type { Clock } from '../ports/clock.port'
import type { ImageUpscaler } from '../ports/image-upscaler.port'

export class UpscaleImageUseCase {
  constructor(
    private readonly upscaler: ImageUpscaler,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpscaleImageInputDTO): Promise<UpscaleImageOutputDTO> {
    const options = UpscaleOptions.create(input.options)
    const startedAt = this.clock.now()

    const image = await this.upscaler.upscale(input.image, options, input.onProgress)

    return {
      image,
      durationMs: this.clock.now() - startedAt,
    }
  }
}
