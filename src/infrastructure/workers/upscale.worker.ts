/**
 * LAYER: Infrastructure
 * Contains: ONNX Runtime Web Worker (4x image upscaling)
 * Rules: Runs off the main thread. May use any library. No domain logic.
 */
// WebGPU EP lives in the `/webgpu` bundle (includes JSEP glue). WASM stays as fallback.
import * as ort from 'onnxruntime-web/webgpu'
import { MODEL_DYNAMIC_DIMS, MODEL_SCALE, ONNXRUNTIME_WASM_CDN } from '../onnx/model'
import { detectWebGpuSupport } from '../onnx/webgpu-support'
import type {
  UpscaleBackend,
  UpscaleWorkerRequest,
  UpscaleWorkerResponse,
} from './messages'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ort.env.wasm.wasmPaths = ONNXRUNTIME_WASM_CDN
ort.env.wasm.numThreads = 1
// The proxy worker is incompatible with the WebGPU EP (GPU buffers are not
// transferable), so the session must live in this dedicated worker directly.
ort.env.wasm.proxy = false

let session: ort.InferenceSession | null = null
let loadedModelUrl: string | null = null
let loadedWindow = -1
let activeBackend: UpscaleBackend = 'wasm'
let requestedProviders: string[] = ['wasm']
let webgpuApi = false

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value

/**
 * Resolves which EP actually engaged. ORT Web exposes the live GPU device via
 * `env.webgpu.device`; if it resolves to a device, the WebGPU EP is in use.
 * Guarded with a timeout so a stuck probe can never block inference.
 */
async function resolveActiveBackend(requestedWebGpu: boolean): Promise<UpscaleBackend> {
  if (!requestedWebGpu) return 'wasm'
  try {
    const device = await Promise.race([
      ort.env.webgpu.device,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
    ])
    return device ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

/**
 * Creates (or reuses) the inference session.
 *
 * `window` is the constant edge of every input tile fed to the model. A fixed
 * window is mandatory on the WebGPU EP: the model declares symbolic
 * `height`/`width`, and without pinning them via `freeDimensionOverrides` the
 * allocator tries to reuse the input buffer for the 4x-larger output and fails.
 * The overrides are also size-bound, so the session is re-created if the window
 * changes (e.g. the user edits the tile size).
 */
async function getSession(modelUrl: string, window: number): Promise<ort.InferenceSession> {
  if (session && loadedModelUrl === modelUrl && loadedWindow === window) return session
  if (session) {
    await session.release?.()
    session = null
  }

  const support = detectWebGpuSupport()
  webgpuApi = support.apiAvailable
  requestedProviders = webgpuApi ? ['webgpu', 'wasm'] : ['wasm']

  const baseOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: requestedProviders,
    graphOptimizationLevel: 'all',
  }

  if (webgpuApi) {
    try {
      session = await ort.InferenceSession.create(modelUrl, {
        ...baseOptions,
        freeDimensionOverrides: {
          [MODEL_DYNAMIC_DIMS.batch]: 1,
          [MODEL_DYNAMIC_DIMS.height]: window,
          [MODEL_DYNAMIC_DIMS.width]: window,
        },
      })
    } catch {
      // Custom models may not declare those symbolic dims; retry without overrides.
      session = await ort.InferenceSession.create(modelUrl, baseOptions)
    }
  } else {
    session = await ort.InferenceSession.create(modelUrl, baseOptions)
  }

  activeBackend = await resolveActiveBackend(webgpuApi)
  loadedModelUrl = modelUrl
  loadedWindow = window
  return session
}

function post(message: UpscaleWorkerResponse, transfer?: Transferable[]): void {
  ctx.postMessage(message, transfer ?? [])
}

async function runInference(
  req: UpscaleWorkerRequest,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray<ArrayBuffer> }> {
  const tile = req.tileSize
  const pad = req.tilePadding
  // Constant input window. WebGPU requires a fixed shape (see getSession).
  const win = tile + 2 * pad

  const activeSession = await getSession(req.modelUrl, win)

  // Report the resolved backend once the session exists (spike diagnostics).
  post({
    type: 'backend',
    id: req.id,
    backend: activeBackend,
    requested: requestedProviders,
    webgpuApi,
  })

  const inputName = activeSession.inputNames[0]
  const outputName = activeSession.outputNames[0]
  const weightInputName =
    activeSession.inputNames.find((name) => name !== inputName) ?? null

  const src = new Uint8ClampedArray(req.rgba)
  const srcW = req.width
  const srcH = req.height
  const outW = srcW * MODEL_SCALE
  const outH = srcH * MODEL_SCALE
  const output = new Uint8ClampedArray(outW * outH * 4)

  const totalTiles = Math.ceil(srcW / tile) * Math.ceil(srcH / tile)
  const plane = win * win
  let processed = 0

  for (let ty = 0; ty < srcH; ty += tile) {
    for (let tx = 0; tx < srcW; tx += tile) {
      const tileW = Math.min(tile, srcW - tx)
      const tileH = Math.min(tile, srcH - ty)

      // Constant-size window anchored so the tile sits at (pad, pad). Out-of-
      // bounds samples are clamped (edge replication), keeping the shape fixed.
      const winX = tx - pad
      const winY = ty - pad
      const input = new Float32Array(3 * plane)
      for (let y = 0; y < win; y++) {
        const sy = clamp(winY + y, 0, srcH - 1)
        const rowSrc = sy * srcW
        for (let x = 0; x < win; x++) {
          const sx = clamp(winX + x, 0, srcW - 1)
          const s = (rowSrc + sx) * 4
          const d = y * win + x
          input[d] = src[s] / 255
          input[plane + d] = src[s + 1] / 255
          input[2 * plane + d] = src[s + 2] / 255
        }
      }

      const feeds: Record<string, ort.Tensor> = {
        [inputName]: new ort.Tensor('float32', input, [1, 3, win, win]),
      }
      if (weightInputName) {
        feeds[weightInputName] = new ort.Tensor(
          'float32',
          Float32Array.from([req.denoiseWeight]),
          [1],
        )
      }

      const results = await activeSession.run(feeds)
      const tileOutput = results[outputName]
      const dims = tileOutput.dims as readonly number[]
      const oh = dims[2]
      const ow = dims[3]
      const data = tileOutput.data as Float32Array
      const outPlane = ow * oh

      // The valid tile sits at window offset `pad`; crop it and place it.
      const cropL = pad * MODEL_SCALE
      const cropT = pad * MODEL_SCALE
      const validW = tileW * MODEL_SCALE
      const validH = tileH * MODEL_SCALE

      for (let y = 0; y < validH; y++) {
        for (let x = 0; x < validW; x++) {
          const o = (cropT + y) * ow + (cropL + x)
          const dst = ((ty * MODEL_SCALE + y) * outW + (tx * MODEL_SCALE + x)) * 4
          output[dst] = data[o] * 255
          output[dst + 1] = data[outPlane + o] * 255
          output[dst + 2] = data[2 * outPlane + o] * 255

          // Alpha is not produced by the model: nearest-neighbour from source.
          const ax = tx + Math.floor(x / MODEL_SCALE)
          const ay = ty + Math.floor(y / MODEL_SCALE)
          output[dst + 3] = src[(ay * srcW + ax) * 4 + 3]
        }
      }

      processed++
      post({
        type: 'progress',
        id: req.id,
        ratio: processed / totalTiles,
        message: `Tile ${processed}/${totalTiles}`,
      })

      // Yield so progress messages flush between tiles.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return { width: outW, height: outH, rgba: output }
}

ctx.addEventListener('message', (event: MessageEvent<UpscaleWorkerRequest>) => {
  const req = event.data
  runInference(req)
    .then(({ width, height, rgba }) => {
      post({ type: 'done', id: req.id, width, height, rgba: rgba.buffer }, [rgba.buffer])
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      post({ type: 'error', id: req.id, message })
    })
})
