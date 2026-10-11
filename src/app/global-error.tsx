'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <h1 className="font-display text-2xl uppercase tracking-brand md:text-4xl">
              Error crítico
            </h1>
            <p className="mt-4 max-w-md mx-auto text-sm text-muted">
              Ha ocurrido un error crítico en la aplicación.{' '}
              <button
                onClick={reset}
                className="text-ink underline underline-offset-2 hover:text-muted"
              >
                Recargar
              </button>
            </p>
          </div>
        </main>
      </body>
    </html>
  )
}