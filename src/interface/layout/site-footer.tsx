import Link from 'next/link'
import { SITE } from '../content/site'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-display text-sm uppercase tracking-brand">
            <span aria-hidden className="inline-block h-2 w-2 bg-ink" />
            {SITE.brand}
          </p>
          <p className="mt-4 max-w-xs text-sm text-muted">{SITE.positioning}</p>
        </div>

        <nav className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-label text-faint">Producto</p>
          {SITE.footer.product.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-label text-faint">Recursos</p>
          {SITE.footer.resources.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-faint md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {SITE.brand} · Prueba de concepto de escalado de imágenes
          </p>
          <p>Modelo Real-ESRGAN · BSD-3-Clause</p>
        </div>
      </div>
    </footer>
  )
}
