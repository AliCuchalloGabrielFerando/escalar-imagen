'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const ORT_VERSION = '1.30.0'
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`
const MODEL_URL = '/models/realesr-general-x4v3.onnx'
const SCALE = 4
/** Output is 16x the input pixels (4x per axis) at 4 bytes/px. */
const MAX_OUTPUT_BYTES = 512 * 1024 * 1024

type Backend = 'wasm' | 'webgpu'

interface RunResult {
  ok: true
  backend: Backend
  createMs: number
  times: number[]
  outW: number
  outH: number
  mean: number
  preview: { width: number; height: number; rgba: ArrayBuffer } | null
}
interface RunError {
  ok: false
  backend: Backend
  message: string
}
type RunOutcome = RunResult | RunError

const label = (backend: Backend) => (backend === 'webgpu' ? 'WebGPU' : 'WASM')

/** Minimal WebGPU types (the TS DOM lib of this project does not declare `navigator.gpu`). */
interface AdapterInfo {
  vendor?: string
  architecture?: string
  description?: string
}
interface AdapterLike {
  info?: AdapterInfo
  requestAdapterInfo?: () => Promise<AdapterInfo>
}
interface GpuLike {
  requestAdapter: () => Promise<AdapterLike | null>
}
const getGpu = (): GpuLike | undefined =>
  typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: GpuLike }).gpu

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function LabBench() {
  const [adapterText, setAdapterText] = useState('Leyendo adaptador WebGPU…')
  const [adapterOk, setAdapterOk] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sample, setSample] = useState('/samples/sample-1.jpg')
  const [tile, setTile] = useState(128)
  const [pad, setPad] = useState(8)
  const [warmup, setWarmup] = useState(1)
  const [runs, setRuns] = useState(3)
  const [status, setStatus] = useState('Listo.')
  const [running, setRunning] = useState(false)
  const [outcomes, setOutcomes] = useState<Partial<Record<Backend, RunOutcome>>>({})
  const [speedup, setSpeedup] = useState<number | null>(null)
  const [imageInfo, setImageInfo] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<{ backend: Backend; resolve: (r: RunOutcome) => void } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const worker = new Worker('/bench-worker.js', { type: 'module' })
    worker.onmessage = (event) => {
      const m = event.data
      const pending = pendingRef.current
      if (!pending || m.backend !== pending.backend) return
      if (m.type === 'progress') {
        setStatus(
          m.phase === 'create'
            ? `${label(m.backend)}: creando sesión…`
            : `${label(m.backend)}: run ${m.i}/${m.total}…`,
        )
      } else if (m.type === 'result') {
        pendingRef.current = null
        pending.resolve({ ok: true, ...m })
      } else if (m.type === 'error') {
        pendingRef.current = null
        pending.resolve({ ok: false, backend: m.backend, message: m.message })
      }
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const gpu = getGpu()
      if (!gpu) {
        setAdapterOk(false)
        setAdapterText('WebGPU: navigator.gpu no disponible en este navegador')
        return
      }
      try {
        const adapter = await gpu.requestAdapter()
        if (cancelled) return
        if (!adapter) {
          setAdapterOk(false)
          setAdapterText('WebGPU: sin adaptador (GPU bloqueada o sin driver Vulkan)')
          return
        }
        const info =
          adapter.info ?? (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : {})
        setAdapterOk(true)
        setAdapterText(
          `WebGPU: adaptador disponible · ${info.vendor ?? '?'} / ${info.architecture ?? '?'} / ${info.description ?? '?'}`,
        )
      } catch (error) {
        if (!cancelled) {
          setAdapterOk(false)
          setAdapterText(`WebGPU: error ${String(error)}`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const runInWorker = useCallback((backend: Backend, cfg: Record<string, unknown>) => {
    return new Promise<RunOutcome>((resolve) => {
      pendingRef.current = { backend, resolve }
      workerRef.current?.postMessage({ type: 'run', backend, ...cfg })
    })
  }, [])

  const loadImage = useCallback(async () => {
    const src = file ? URL.createObjectURL(file) : sample
    const bitmap = await createImageBitmap(await (await fetch(src)).blob())
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('No hay contexto 2D')
    ctx.drawImage(bitmap, 0, 0)
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    bitmap.close()
    if (file) URL.revokeObjectURL(src)
    return { rgba: new Uint8ClampedArray(data.data), width: canvas.width, height: canvas.height }
  }, [file, sample])

  const run = useCallback(async () => {
    setRunning(true)
    setOutcomes({})
    setSpeedup(null)
    try {
      setStatus('Cargando imagen…')
      const image = await loadImage()
      setImageInfo(`${image.width}×${image.height}`)

      const outBytes = image.width * SCALE * image.height * SCALE * 4
      if (outBytes > MAX_OUTPUT_BYTES) {
        const mp = Math.round((image.width * image.height) / 1e6)
        setStatus(
          `Imagen demasiado grande (${image.width}×${image.height}, ${mp} MP). La salida 4× ocuparía ~${formatBytes(outBytes)}. Usa una imagen más pequeña.`,
        )
        return
      }

      workerRef.current?.postMessage(
        { type: 'setImage', rgba: image.rgba.buffer, width: image.width, height: image.height },
        [image.rgba.buffer],
      )

      const cfg = { tile, pad, warmup, runs, modelUrl: MODEL_URL, ortBase: ORT_BASE }
      setStatus(`Imagen ${image.width}×${image.height}, tile ${tile}, pad ${pad}`)

      const wasm = await runInWorker('wasm', cfg)
      setOutcomes((prev) => ({ ...prev, wasm }))
      const gpu = await runInWorker('webgpu', cfg)
      setOutcomes((prev) => ({ ...prev, webgpu: gpu }))

      if (wasm.ok && gpu.ok) {
        const wasmMean = wasm.times.reduce((a, b) => a + b, 0) / wasm.times.length
        const gpuMean = gpu.times.reduce((a, b) => a + b, 0) / gpu.times.length
        setSpeedup(wasmMean / gpuMean)
        setStatus('Benchmark completado.')
      } else {
        setStatus('Benchmark completado (ver estados).')
      }
    } catch (error) {
      setStatus(`Error: ${String(error)}`)
    } finally {
      setRunning(false)
    }
  }, [loadImage, pad, runInWorker, runs, tile, warmup])

  // Draw the last available preview.
  useEffect(() => {
    const preview = outcomes.webgpu?.ok
      ? outcomes.webgpu.preview
      : outcomes.wasm?.ok
        ? outcomes.wasm.preview
        : null
    const canvas = canvasRef.current
    if (!preview || !canvas) return
    canvas.width = preview.width
    canvas.height = preview.height
    const ctx = canvas.getContext('2d')
    ctx?.putImageData(
      new ImageData(new Uint8ClampedArray(preview.rgba), preview.width, preview.height),
      0,
      0,
    )
  }, [outcomes])

  const rows: Array<{ backend: Backend; outcome: RunOutcome | undefined }> = [
    { backend: 'wasm', outcome: outcomes.wasm },
    { backend: 'webgpu', outcome: outcomes.webgpu },
  ]

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-lg uppercase tracking-brand">Laboratorio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Compara <strong>WebGPU</strong> vs <strong>WASM</strong> con Real-ESRGAN{' '}
        <code>realesr-general-x4v3</code> sobre la misma imagen y el mismo tiling. El cómputo corre
        en un Web Worker, así que la página no se bloquea. En Brave/Linux puede requerir{' '}
        <code>brave://flags/#enable-unsafe-webgpu</code> y <code>#enable-vulkan</code>.
      </p>

      <p className="mt-4 text-sm">
        <span className={adapterOk === false ? 'text-ink' : 'text-muted'}>{adapterText}</span>
      </p>

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">Imagen</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="border border-hairline bg-paper px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">o muestra</span>
          <select
            value={sample}
            onChange={(event) => {
              setSample(event.target.value)
              setFile(null)
            }}
            className="border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="/samples/sample-1.jpg">sample-1.jpg (240×180)</option>
            <option value="/samples/sample-2.jpg">sample-2.jpg (240×180)</option>
            <option value="/samples/sample-3.jpg">sample-3.jpg (240×180)</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">Tile (px)</span>
          <input
            type="number"
            min={16}
            step={16}
            value={tile}
            onChange={(event) => setTile(Number(event.target.value))}
            className="w-24 border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">Padding</span>
          <input
            type="number"
            min={0}
            step={1}
            value={pad}
            onChange={(event) => setPad(Number(event.target.value))}
            className="w-20 border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">Warmup</span>
          <input
            type="number"
            min={0}
            value={warmup}
            onChange={(event) => setWarmup(Number(event.target.value))}
            className="w-20 border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">Runs</span>
          <input
            type="number"
            min={1}
            value={runs}
            onChange={(event) => setRuns(Number(event.target.value))}
            className="w-20 border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="bg-ink px-6 py-3 text-xs uppercase tracking-label text-paper transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {running ? 'Ejecutando…' : 'Ejecutar'}
        </button>
      </div>

      <p className="mt-4 text-xs uppercase tracking-label text-muted">
        {status}
        {imageInfo ? ` · ${imageInfo}` : ''}
      </p>

      {speedup !== null && (
        <p className="mt-2 text-sm">
          Speedup WebGPU: <span className="font-display text-2xl">{speedup.toFixed(2)}×</span> vs WASM
        </p>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-label text-faint">
            <th className="border border-hairline px-3 py-2 text-left">Backend</th>
            <th className="border border-hairline px-3 py-2 text-left">Crear sesión</th>
            <th className="border border-hairline px-3 py-2 text-left">Runs (ms)</th>
            <th className="border border-hairline px-3 py-2 text-left">Media</th>
            <th className="border border-hairline px-3 py-2 text-left">Salida</th>
            <th className="border border-hairline px-3 py-2 text-left">Mean RGB</th>
            <th className="border border-hairline px-3 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ backend, outcome }) => {
            const mean =
              outcome?.ok && outcome.times.length
                ? outcome.times.reduce((a, b) => a + b, 0) / outcome.times.length
                : null
            return (
              <tr key={backend}>
                <td className="border border-hairline px-3 py-2">{label(backend)}</td>
                {outcome === undefined ? (
                  <td className="border border-hairline px-3 py-2 text-muted" colSpan={6}>
                    pendiente
                  </td>
                ) : outcome.ok ? (
                  <>
                    <td className="border border-hairline px-3 py-2">{Math.round(outcome.createMs)} ms</td>
                    <td className="border border-hairline px-3 py-2">
                      {outcome.times.map((t) => Math.round(t)).join(', ')}
                    </td>
                    <td className="border border-hairline px-3 py-2 font-bold">
                      {mean !== null ? `${Math.round(mean)} ms` : '—'}
                    </td>
                    <td className="border border-hairline px-3 py-2">
                      {outcome.outW}×{outcome.outH}
                    </td>
                    <td className="border border-hairline px-3 py-2">{outcome.mean.toFixed(4)}</td>
                    <td className="border border-hairline px-3 py-2">OK</td>
                  </>
                ) : (
                  <td className="border border-hairline px-3 py-2 text-ink" colSpan={6}>
                    ERROR: {outcome.message}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-6 border border-hairline p-4">
        <p className="text-xs uppercase tracking-label text-faint">Preview</p>
        <canvas ref={canvasRef} className="mt-3 max-w-full border border-hairline" />
      </div>
    </div>
  )
}
