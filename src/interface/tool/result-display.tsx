'use client'

import type { UpscaleStatus } from '../hooks/use-upscale-image'

export function ResultDisplay({
  inputUrl,
  inputLabel,
  resultUrl,
  resultWidth,
  resultHeight,
  status,
  progress,
  message,
  durationMs,
  error,
  backend,
  webgpuApi,
}: {
  inputUrl: string
  inputLabel: string
  resultUrl: string | null
  resultWidth: number
  resultHeight: number
  status: UpscaleStatus
  progress: number
  message: string
  durationMs: number | null
  error: string | null
  backend: 'webgpu' | 'wasm' | null
  webgpuApi: boolean
}) {
  const busy = status === 'decoding' || status === 'upscaling' || status === 'encoding'
  const done = status === 'done' && resultUrl !== null

  return (
    <div className="border border-hairline">
      <div className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <figure className="p-4">
          <figcaption className="mb-3 truncate text-xs uppercase tracking-label text-muted">
            Original · {inputLabel}
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={inputUrl} alt="Imagen original" className="mx-auto max-h-64 w-auto" />
        </figure>

        <figure className="p-4">
          <figcaption className="mb-3 text-xs uppercase tracking-label text-muted">
            Resultado {resultWidth > 0 ? `· ${resultWidth}×${resultHeight}` : ''}
          </figcaption>
          {done ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultUrl ?? ''}
              alt="Imagen escalada"
              className="mx-auto max-h-64 w-auto"
            />
          ) : (
            <div className="grid h-40 place-items-center text-xs uppercase tracking-label text-faint">
              {busy ? message || 'Procesando…' : 'Pendiente'}
            </div>
          )}
        </figure>
      </div>

      {!done && (
        <div className="border-t border-hairline px-4 py-3">
          <div className="h-px w-full bg-hairline">
            <div
              className="h-px bg-ink transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {busy ? `${Math.round(progress * 100)}% · ${message}` : 'Listo para escalar'}
          </p>
        </div>
      )}

      {done && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          <p className="flex items-center gap-3 text-xs text-muted">
            <span>{durationMs !== null ? `${Math.round(durationMs)} ms` : ''}</span>
            {backend && (
              <span
                className="border border-hairline px-2 py-0.5 uppercase tracking-label"
                title={
                  webgpuApi
                    ? 'navigator.gpu disponible en este navegador'
                    : 'navigator.gpu no disponible: se usó WASM'
                }
              >
                {backend === 'webgpu' ? 'WebGPU' : 'WASM'}
              </span>
            )}
          </p>
          <a
            href={resultUrl ?? '#'}
            download={`escala4x-${resultWidth}x${resultHeight}.png`}
            className="text-xs uppercase tracking-label underline underline-offset-4"
          >
            Descargar PNG
          </a>
        </div>
      )}

      {error && (
        <p className="border-t border-hairline px-4 py-3 text-xs text-ink">Error: {error}</p>
      )}
    </div>
  )
}
