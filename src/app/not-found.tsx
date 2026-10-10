import Link from 'next/link'
import { SITE } from '@/interface/content/site'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-2xl uppercase tracking-brand md:text-4xl">
          404
        </h1>
        <p className="mt-4 max-w-md mx-auto text-sm text-muted">
          Página no encontrada.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-ink underline underline-offset-2 hover:text-muted"
        >
          Volver a {SITE.brand}
        </Link>
      </div>
    </main>
  )
}