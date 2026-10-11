/**
 * LAYER: Infrastructure
 * Contains: WorkerImageUpscaler (ImageUpscaler implementation)
 * Rules: Implements an Application port. Bridges the main thread <-> Web Worker.
 */
import type {
  ImageUpscaler,
  UpscaleBackendInfo,
  UpscaleProgress,
} from '@/application/ports/image-upscaler.port'
import { RgbaImage } from '@/domain/value-objects/rgba-image.vo'
import type { UpscaleOptions } from '@/domain/value-objects/upscale-options.vo'
import { DEFAULT_MODEL_URL } from '../onnx/model'
import type { UpscaleWorkerRequest, UpscaleWorkerResponse } from '../workers/messages'

interface PendingRequest {
  resolve: (image: RgbaImage) => void
  reject: (error: Error) => void
  onProgress?: (progress: UpscaleProgress) => void
  onBackend?: (info: UpscaleBackendInfo) => void
}

export class WorkerImageUpscaler implements ImageUpscaler {
  private worker: Worker | null = null
  private readonly pending = new Map<string, PendingRequest>()

  constructor(private readonly modelUrl: string = DEFAULT_MODEL_URL) {}

  async upscale(
    image: RgbaImage,
    options: UpscaleOptions,
    onProgress?: (progress: UpscaleProgress) => void,
    onBackend?: (info: UpscaleBackendInfo) => void,
  ): Promise<RgbaImage> {
    const worker = this.ensureWorker()
    const id = crypto.randomUUID()
    const rgba = image.data.slice().buffer

    return new Promise<RgbaImage>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress, onBackend })

      const request: UpscaleWorkerRequest = {
        id,
        modelUrl: this.modelUrl,
        width: image.width,
        height: image.height,
        rgba,
        tileSize: options.tileSize,
        tilePadding: options.tilePadding,
        denoiseWeight: options.denoiseWeight,
      }
      worker.postMessage(request, [rgba])
    })
  }

  /** Terminate the worker and free the model from memory. */
  dispose(): void {
    this.worker?.terminate()
    this.worker = null
    this.pending.clear()
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker

    const worker = new Worker(new URL('../workers/upscale.worker.ts', import.meta.url))
    worker.onmessage = (event: MessageEvent<UpscaleWorkerResponse>) =>
      this.handleMessage(event.data)
    worker.onerror = (event) => this.failAll(event.message || 'Worker error')
    this.worker = worker
    return worker
  }

  private handleMessage(message: UpscaleWorkerResponse): void {
    const entry = this.pending.get(message.id)
    if (!entry) return

    if (message.type === 'progress') {
      entry.onProgress?.({ ratio: message.ratio, message: message.message })
      return
    }

    if (message.type === 'backend') {
      entry.onBackend?.({
        backend: message.backend,
        requested: message.requested,
        webgpuApi: message.webgpuApi,
      })
      return
    }

    this.pending.delete(message.id)

    if (message.type === 'error') {
      entry.reject(new Error(message.message))
      return
    }

    entry.resolve(
      RgbaImage.create(message.width, message.height, new Uint8ClampedArray(message.rgba)),
    )
  }

  private failAll(reason: string): void {
    for (const entry of this.pending.values()) entry.reject(new Error(reason))
    this.pending.clear()
    this.worker?.terminate()
    this.worker = null
  }
}
