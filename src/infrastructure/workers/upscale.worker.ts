/**
 * LAYER: Infrastructure
 * Contains: ONNX Runtime Web Worker (4x image upscaling)
 * Rules: Runs off the main thread. May use any library. No domain logic.
 */
import * as ort from 'onnxruntime-web'
import { MODEL_SCALE, ONNXRUNTIME_WASM_CDN } from '../onnx/model'
import type { UpscaleWorkerRequest, UpscaleWorkerResponse } from './messages'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ort.env.wasm.wasmPaths = ONNXRUNTIME_WASM_CDN
ort.env.wasm.numThreads = 1
ort.env.wasm.proxy = false

let session: ort.InferenceSession | null = null
let loadedModelUrl: string | null = null

async function getSession(modelUrl: string): Promise<ort.InferenceSession> {
  if (session && loadedModelUrl === modelUrl) return session
  session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  })
  loadedModelUrl = modelUrl
  return session
}

function post(message: UpscaleWorkerResponse, transfer?: Transferable[]): void {
  ctx.postMessage(message, transfer ?? [])
}

async function runInference(
  req: UpscaleWorkerRequest,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray<ArrayBuffer> }> {
  const activeSession = await getSession(req.modelUrl)
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

  const tile = req.tileSize
  const pad = req.tilePadding
  const totalTiles = Math.ceil(srcW / tile) * Math.ceil(srcH / tile)
  let processed = 0

  for (let ty = 0; ty < srcH; ty += tile) {
    for (let tx = 0; tx < srcW; tx += tile) {
      const tileW = Math.min(tile, srcW - tx)
      const tileH = Math.min(tile, srcH - ty)

      // Padded source window (clamped to the image bounds).
      const sx = Math.max(0, tx - pad)
      const sy = Math.max(0, ty - pad)
      const ex = Math.min(srcW, tx + tileW + pad)
      const ey = Math.min(srcH, ty + tileH + pad)
      const pw = ex - sx
      const ph = ey - sy

      // RGBA -> NCHW float32 RGB in [0, 1].
      const plane = pw * ph
      const input = new Float32Array(3 * plane)
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
          const s = ((sy + y) * srcW + (sx + x)) * 4
          const d = y * pw + x
          input[d] = src[s] / 255
          input[plane + d] = src[s + 1] / 255
          input[2 * plane + d] = src[s + 2] / 255
        }
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

      // Crop away the padding introduced for this tile, then place it.
      const cropL = (tx - sx) * MODEL_SCALE
      const cropT = (ty - sy) * MODEL_SCALE
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
