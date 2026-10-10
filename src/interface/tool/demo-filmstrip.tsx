'use client'

import type { Sample } from '../content/samples'

export function DemoFilmstrip({
  samples,
  selectedId,
  onSelect,
  onBrowse,
  disabled,
}: {
  samples: Sample[]
  selectedId: string | null
  onSelect: (sample: Sample) => void
  onBrowse: () => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-2 md:w-24 md:flex-col">
      {samples.map((sample) => (
        <button
          key={sample.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(sample)}
          title={sample.label}
          aria-label={sample.label}
          aria-pressed={selectedId === sample.id}
          className={`aspect-[4/3] w-20 shrink-0 overflow-hidden border transition-colors disabled:opacity-50 md:w-full ${
            selectedId === sample.id ? 'border-ink' : 'border-hairline hover:border-faint'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sample.src} alt={sample.label} className="h-full w-full object-cover" />
        </button>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={onBrowse}
        title="Usar mi imagen"
        aria-label="Usar mi imagen"
        className="grid aspect-[4/3] w-20 shrink-0 place-items-center border border-dashed border-hairline text-lg text-muted transition-colors hover:border-faint hover:text-ink disabled:opacity-50 md:w-full"
      >
        +
      </button>
    </div>
  )
}
