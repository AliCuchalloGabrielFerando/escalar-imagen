'use client'

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MODEL_URL, UpscaleOptions } from '@/composition/container'
import { SAMPLES, type Sample } from '../content/samples'
import { useUpscaleImage } from '../hooks/use-upscale-image'
import { DemoFilmstrip } from './demo-filmstrip'
import { ResultDisplay } from './result-display'
import { UploadDropzone } from './upload-dropzone'

interface SelectedInput {
  blob: Blob
  url: string
  label: string
}

export function ToolSection() {
  const {
    status,
    progress,
    message,
    error,
    resultUrl,
    resultWidth,
    resultHeight,
    durationMs,
    upscale,
    reset,
  } = useUpscaleImage()

  const [input, setInput] = useState<SelectedInput | null>(null)
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL_URL)
  const [tileSize, setTileSize] = useState<number>(UpscaleOptions.DEFAULT_TILE_SIZE)
  const [tilePadding, setTilePadding] = useState<number>(UpscaleOptions.DEFAULT_TILE_PADDING)
  const [denoiseWeight, setDenoiseWeight] = useState<number>(UpscaleOptions.DEFAULT_DENOISE_WEIGHT)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const busy = status === 'decoding' || status === 'upscaling' || status === 'encoding'
  const done = status === 'done'

  useEffect(() => {
    if (!input) return
    return () => URL.revokeObjectURL(input.url)
  }, [input])

  const openPicker = () => fileInputRef.current?.click()

  const selectFile = (file: File) => {
    reset()
    setSelectedSample(null)
    setInput({ blob: file, url: URL.createObjectURL(file), label: file.name })
  }

  const selectSample = async (sample: Sample) => {
    reset()
    setSelectedSample(sample.id)
    try {
      const response = await fetch(sample.src)
      const blob = await response.blob()
      setInput({ blob, url: URL.createObjectURL(blob), label: sample.label })
    } catch {
      setSelectedSample(null)
    }
  }

  const run = () => {
    if (!input) return
    upscale(input.blob, modelUrl.trim() || DEFAULT_MODEL_URL, {
      tileSize,
      tilePadding,
      denoiseWeight,
    })
  }

  const restart = () => {
    reset()
    setInput(null)
    setSelectedSample(null)
  }

  return (
    <div id="tool" className="scroll-mt-20">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) selectFile(file)
          event.target.value = ''
        }}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          {input ? (
            <ResultDisplay
              inputUrl={input.url}
              inputLabel={input.label}
              resultUrl={resultUrl}
              resultWidth={resultWidth}
              resultHeight={resultHeight}
              status={status}
              progress={progress}
              message={message}
              durationMs={durationMs}
              error={error}
            />
          ) : (
            <UploadDropzone onFile={selectFile} onBrowse={openPicker} />
          )}
        </div>

        <DemoFilmstrip
          samples={SAMPLES}
          selectedId={selectedSample}
          onSelect={selectSample}
          onBrowse={openPicker}
          disabled={busy}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={run}
          disabled={!input || busy}
          className="bg-ink px-6 py-3 text-xs uppercase tracking-label text-paper transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? 'Procesando…' : 'Escalar 4x'}
        </button>

        {(input || done) && (
          <button
            type="button"
            onClick={restart}
            disabled={busy}
            className="text-xs uppercase tracking-label text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
          >
            Reiniciar
          </button>
        )}

        <span className="text-xs uppercase tracking-label text-faint">
          {busy ? message : done ? 'Completado' : input ? 'Listo' : 'Elige una imagen'}
        </span>
      </div>

      <details className="mt-8 border-t border-hairline pt-6">
        <summary className="cursor-pointer text-xs uppercase tracking-label text-muted">
          Opciones avanzadas
        </summary>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-label text-faint">Modelo ONNX</span>
            <input
              type="text"
              value={modelUrl}
              onChange={(event) => setModelUrl(event.target.value)}
              spellCheck={false}
              className="border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-label text-faint">Tile size (px)</span>
            <input
              type="number"
              min={16}
              step={16}
              value={tileSize}
              onChange={(event) => setTileSize(Number(event.target.value))}
              className="border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-label text-faint">Tile padding (px)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={tilePadding}
              onChange={(event) => setTilePadding(Number(event.target.value))}
              className="border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-label text-faint">Denoise (0–1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={denoiseWeight}
              onChange={(event) => setDenoiseWeight(Number(event.target.value))}
              className="border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>
        </div>
      </details>
    </div>
  )
}
