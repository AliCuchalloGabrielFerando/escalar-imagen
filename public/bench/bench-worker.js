/**
 * Benchmark worker: runs Real-ESRGAN upscaling off the main thread so the page
 * stays responsive. Imports onnxruntime-web from a CDN and keeps the source
 * image in worker memory across runs.
 *
 * Messages in:
 *   { type: 'setImage', rgba: ArrayBuffer, width, height }
 *   { type: 'run', backend: 'wasm'|'webgpu', tile, pad, warmup, runs, modelUrl, ortBase }
 * Messages out:
 *   { type: 'progress', backend, phase, i, total }
 *   { type: 'result', backend, createMs, times, outW, outH, mean, preview }
 *   { type: 'error', backend, message }
 */
const SCALE = 4
const FDO_NAMES = { batch: 'batch_size', height: 'height', width: 'width' }

let ortPromise = null
let source = null
let srcW = 0
let srcH = 0

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v)

async function getOrt(ortBase) {
  if (!ortPromise) {
    ortPromise = import(/* @vite-ignore */ ortBase + 'ort.webgpu.bundle.min.mjs').then((ort) => {
      ort.env.wasm.wasmPaths = ortBase
      ort.env.wasm.numThreads = 1
      ort.env.wasm.proxy = false
      return ort
    })
  }
  return ortPromise
}

function meanOf(buf) {
  let sum = 0
  for (let i = 0; i < buf.length; i += 4) sum += buf[i] + buf[i + 1] + buf[i + 2]
  return sum / ((buf.length / 4) * 3) / 255
}

async function upscale(ort, session, tile, pad) {
  const win = tile + 2 * pad
  const outW = srcW * SCALE
  const outH = srcH * SCALE
  const output = new Uint8ClampedArray(outW * outH * 4)
  const plane = win * win
  const inputName = session.inputNames[0]
  const outputName = session.outputNames[0]

  for (let ty = 0; ty < srcH; ty += tile) {
    for (let tx = 0; tx < srcW; tx += tile) {
      const tileW = Math.min(tile, srcW - tx)
      const tileH = Math.min(tile, srcH - ty)
      const winX = tx - pad
      const winY = ty - pad
      const input = new Float32Array(3 * plane)
      for (let y = 0; y < win; y++) {
        const sy = clamp(winY + y, 0, srcH - 1)
        const row = sy * srcW
        for (let x = 0; x < win; x++) {
          const sx = clamp(winX + x, 0, srcW - 1)
          const s = (row + sx) * 4
          const d = y * win + x
          input[d] = source[s] / 255
          input[plane + d] = source[s + 1] / 255
          input[2 * plane + d] = source[s + 2] / 255
        }
      }
      const feeds = { [inputName]: new ort.Tensor('float32', input, [1, 3, win, win]) }
      const results = await session.run(feeds)
      const t = results[outputName]
      const oh = t.dims[2]
      const ow = t.dims[3]
      const data = t.data
      const outPlane = ow * oh
      const cropL = pad * SCALE
      const cropT = pad * SCALE
      const validW = tileW * SCALE
      const validH = tileH * SCALE
      for (let y = 0; y < validH; y++) {
        for (let x = 0; x < validW; x++) {
          const o = (cropT + y) * ow + (cropL + x)
          const dst = ((ty * SCALE + y) * outW + (tx * SCALE + x)) * 4
          output[dst] = data[o] * 255
          output[dst + 1] = data[outPlane + o] * 255
          output[dst + 2] = data[2 * outPlane + o] * 255
          const ax = tx + Math.floor(x / SCALE)
          const ay = ty + Math.floor(y / SCALE)
          output[dst + 3] = source[(ay * srcW + ax) * 4 + 3]
        }
      }
    }
    // Yield so progress can flow and the worker isn't a black box.
    await new Promise((r) => setTimeout(r, 0))
  }
  return { output, outW, outH }
}

function makePreview(output, outW, outH) {
  if (typeof OffscreenCanvas === 'undefined') return null
  const max = 512
  const s = Math.min(1, max / Math.max(outW, outH))
  const pw = Math.max(1, Math.round(outW * s))
  const ph = Math.max(1, Math.round(outH * s))
  const src = new OffscreenCanvas(outW, outH)
  src.getContext('2d').putImageData(new ImageData(output, outW, outH), 0, 0)
  const dst = new OffscreenCanvas(pw, ph)
  dst.getContext('2d').drawImage(src, 0, 0, pw, ph)
  const img = dst.getContext('2d').getImageData(0, 0, pw, ph)
  return { rgba: img.data.buffer, width: pw, height: ph }
}

async function runBackend({ backend, tile, pad, warmup, runs, modelUrl, ortBase }) {
  const ort = await getOrt(ortBase)
  const options = { executionProviders: [backend], graphOptimizationLevel: 'all' }
  if (backend === 'webgpu') {
    options.freeDimensionOverrides = {
      [FDO_NAMES.batch]: 1,
      [FDO_NAMES.height]: tile + 2 * pad,
      [FDO_NAMES.width]: tile + 2 * pad,
    }
  }

  self.postMessage({ type: 'progress', backend, phase: 'create', i: 0, total: 1 })
  const tCreate0 = performance.now()
  const session = await ort.InferenceSession.create(modelUrl, options)
  const createMs = performance.now() - tCreate0

  const times = []
  let out = null
  for (let i = 0; i < warmup + runs; i++) {
    self.postMessage({ type: 'progress', backend, phase: 'run', i: i + 1, total: warmup + runs })
    const t0 = performance.now()
    out = await upscale(ort, session, tile, pad)
    const ms = performance.now() - t0
    if (i >= warmup) times.push(ms)
  }
  await session.release?.()

  const preview = makePreview(out.output, out.outW, out.outH)
  self.postMessage(
    {
      type: 'result',
      backend,
      createMs,
      times,
      outW: out.outW,
      outH: out.outH,
      mean: meanOf(out.output),
      preview,
    },
    preview ? [preview.rgba] : [],
  )
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'setImage') {
    source = new Uint8ClampedArray(msg.rgba)
    srcW = msg.width
    srcH = msg.height
    return
  }
  if (msg.type === 'run') {
    try {
      await runBackend(msg)
    } catch (err) {
      self.postMessage({ type: 'error', backend: msg.backend, message: String(err).slice(0, 300) })
    }
  }
}
