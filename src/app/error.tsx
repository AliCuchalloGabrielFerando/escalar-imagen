'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-2xl uppercase tracking-brand md:text-4xl">
          Error
        </h1>
        <p className="mt-4 max-w-md mx-auto text-sm text-muted">
          Ha ocurrido un error inesperado.{' '}
          <button
            onClick={reset}
            className="text-ink underline underline-offset-2 hover:text-muted"
          >
            Reintentar
          </button>
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-faint font-mono">
            {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}