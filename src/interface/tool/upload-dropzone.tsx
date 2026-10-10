'use client'

import { useState } from 'react'

export function UploadDropzone({
  onFile,
  onBrowse,
}: {
  onFile: (file: File) => void
  onBrowse: () => void
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onBrowse}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onBrowse()
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
      className={`grid min-h-[320px] cursor-pointer place-items-center border border-dashed px-6 text-center transition-colors ${
        dragging ? 'border-ink bg-surface' : 'border-hairline hover:border-faint'
      }`}
    >
      <div>
        <p className="text-sm">Arrastra una imagen aquí o haz clic para elegir</p>
        <p className="mt-3 text-xs uppercase tracking-label text-faint">PNG · JPG · WEBP</p>
      </div>
    </div>
  )
}
