'use client'

import type { OutputFormat } from '@/composition/container'
import type { UpscaleStatus } from '../hooks/use-upscale-image'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ResultDisplay({
  inputUrl,
  inputLabel,
  resultUrl,
  resultWidth,
  resultHeight,
  resultFormat,
  resultExtension,
  resultBytes,
  status,
  progress,
  message,
  durationMs,
  error,
}: {
  inputUrl: string
  inputLabel: string
  resultUrl: string | null
  resultWidth: number
  resultHeight: number
  resultFormat: OutputFormat | null
  resultExtension: string | null
  resultBytes: number | null
  status: UpscaleStatus
  progress: number
  message: string
  durationMs: number | null
  error: string | null
}) {
  const busy = status === 'decoding' || status === 'upscaling' || status === 'encoding'
  const showResult = resultUrl !== null
  const reencoding = showResult && status === 'encoding'
  const formatLabel = resultFormat ? resultFormat.toUpperCase() : 'PNG'

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
            {reencoding ? ' · recodificando…' : ''}
          </figcaption>
          {showResult ? (
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

      {busy && !showResult && (
        <div className="border-t border-hairline px-4 py-3">
          <div className="h-px w-full bg-hairline">
            <div
              className="h-px bg-ink transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {`${Math.round(progress * 100)}% · ${message}`}
          </p>
        </div>
      )}

      {showResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          <p className="flex items-center gap-3 text-xs text-muted">
            <span>{durationMs !== null ? `${Math.round(durationMs)} ms` : ''}</span>
            {resultBytes !== null && (
              <span className="uppercase tracking-label">{formatBytes(resultBytes)}</span>
            )}
          </p>
          <a
            href={resultUrl ?? '#'}
            download={`escala4x-${resultWidth}x${resultHeight}.${resultExtension ?? 'png'}`}
            className="text-xs uppercase tracking-label underline underline-offset-4"
          >
            Descargar {formatLabel}
          </a>
        </div>
      )}

      {error && (
        <p className="border-t border-hairline px-4 py-3 text-xs text-ink">Error: {error}</p>
      )}
    </div>
  )
}
