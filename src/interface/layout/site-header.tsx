'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SITE } from '../content/site'
import { ThemeToggle } from '../theme/theme-toggle'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-sm uppercase tracking-brand"
        >
          <span aria-hidden className="inline-block h-2 w-2 bg-ink" />
          {SITE.brand}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {SITE.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs uppercase tracking-label text-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <ThemeToggle />
          <Link
            href="/#tool"
            className="hidden text-xs uppercase tracking-label underline-offset-4 hover:underline md:inline-block"
          >
            Escalar ahora
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-xs uppercase tracking-label md:hidden"
            aria-expanded={open}
            aria-label="Abrir menú"
          >
            {open ? 'Cerrar' : 'Menú'}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-hairline bg-paper md:hidden">
          <div className="mx-auto flex max-w-5xl flex-col px-6 py-2">
            {SITE.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-hairline py-3 text-xs uppercase tracking-label text-muted"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/#tool"
              onClick={() => setOpen(false)}
              className="py-3 text-xs uppercase tracking-label"
            >
              Escalar ahora
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
