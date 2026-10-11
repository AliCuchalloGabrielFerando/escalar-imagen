'use client'

import type { FormatCapability, OutputFormat } from '@/composition/container'

export function OutputOptions({
  capabilities,
  format,
  quality,
  onFormatChange,
  onQualityChange,
  disabled,
}: {
  capabilities: FormatCapability[]
  format: OutputFormat
  quality: number
  onFormatChange: (format: OutputFormat) => void
  onQualityChange: (quality: number) => void
  disabled: boolean
}) {
  const current = capabilities.find((entry) => entry.format === format)
  const showQuality = current?.lossy ?? false

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-label text-faint">Formato</span>
        <select
          value={format}
          onChange={(event) => onFormatChange(event.target.value as OutputFormat)}
          disabled={disabled}
          className="border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-40"
        >
          {capabilities.map((entry) => (
            <option key={entry.format} value={entry.format} disabled={!entry.encodable}>
              {entry.label}
              {entry.encodable ? '' : ' (no soportado)'}
            </option>
          ))}
        </select>
      </label>

      {showQuality && (
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-label text-faint">
            Calidad · {Math.round(quality * 100)}
          </span>
          <input
            type="range"
            min={0.4}
            max={0.99}
            step={0.01}
            value={quality}
            onChange={(event) => onQualityChange(Number(event.target.value))}
            disabled={disabled}
            className="w-40 accent-ink disabled:opacity-40"
          />
        </label>
      )}
    </div>
  )
}
