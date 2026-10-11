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
let loadedKey: string | null = null
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
 * When WebGPU is available, the model's symbolic `height`/`width` are pinned via
 * `freeDimensionOverrides` (otherwise the allocator reuses the input buffer for
 * the 4x-larger output and fails with "Shape mismatch attempting to re-use
 * buffer"). The override is size-bound, so the session is re-created when the
 * window changes. Pure-WASM machines skip all of this (no override, variable
 * windows) and keep the cheaper original path.
 */
async function getSession(modelUrl: string, window: number): Promise<ort.InferenceSession> {
  const support = detectWebGpuSupport()
  webgpuApi = support.apiAvailable

  const cacheKey = webgpuApi ? `${modelUrl}|${window}` : modelUrl
  if (session && loadedKey === cacheKey) return session
  if (session) {
    await session.release?.()
    session = null
  }

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
  loadedKey = cacheKey
  return session
}

function post(message: UpscaleWorkerResponse, transfer?: Transferable[]): void {
  ctx.postMessage(message, transfer ?? [])
}

/**
 * Builds the NCHW float32 RGB input window. When `clampEdges` is true the window
 * may read outside the image (replicating edge pixels) to keep a constant shape.
 */
function buildInput(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  clampEdges: boolean,
): Float32Array {
  const plane = width * height
  const input = new Float32Array(3 * plane)
  for (let y = 0; y < height; y++) {
    const sy = clampEdges ? clamp(originY + y, 0, srcH - 1) : originY + y
    const rowSrc = sy * srcW
    for (let x = 0; x < width; x++) {
      const sx = clampEdges ? clamp(originX + x, 0, srcW - 1) : originX + x
      const s = (rowSrc + sx) * 4
      const d = y * width + x
      input[d] = src[s] / 255
      input[plane + d] = src[s + 1] / 255
      input[2 * plane + d] = src[s + 2] / 255
    }
  }
  return input
}

async function runInference(
  req: UpscaleWorkerRequest,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray<ArrayBuffer> }> {
  const tile = req.tileSize
  const pad = req.tilePadding
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
  let processed = 0

  for (let ty = 0; ty < srcH; ty += tile) {
    for (let tx = 0; tx < srcW; tx += tile) {
      const tileW = Math.min(tile, srcW - tx)
      const tileH = Math.min(tile, srcH - ty)

      let pw: number
      let ph: number
      let cropL: number
      let cropT: number
      let input: Float32Array

      if (webgpuApi) {
        // WebGPU: fixed-size window (required by freeDimensionOverrides), with
        // edge replication so the shape never varies.
        pw = win
        ph = win
        cropL = pad * MODEL_SCALE
        cropT = pad * MODEL_SCALE
        input = buildInput(src, srcW, srcH, tx - pad, ty - pad, win, win, true)
      } else {
        // WASM: variable window clamped to the image bounds (original, cheaper).
        const sx = Math.max(0, tx - pad)
        const sy = Math.max(0, ty - pad)
        const ex = Math.min(srcW, tx + tileW + pad)
        const ey = Math.min(srcH, ty + tileH + pad)
        pw = ex - sx
        ph = ey - sy
        cropL = (tx - sx) * MODEL_SCALE
        cropT = (ty - sy) * MODEL_SCALE
        input = buildInput(src, srcW, srcH, sx, sy, pw, ph, false)
      }

      const feeds: Record<string, ort.Tensor> = {
        [inputName]: new ort.Tensor('float32', input, [1, 3, ph, pw]),
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

      // Crop the valid tile out of the window and place it.
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
