import type { ReactNode } from 'react'

type ContainerSize = 'wide' | 'tool' | 'editorial' | 'narrow'

const MAX_WIDTH: Record<ContainerSize, string> = {
  wide: 'max-w-5xl',
  tool: 'max-w-4xl',
  editorial: 'max-w-3xl',
  narrow: 'max-w-2xl',
}

export function Container({
  children,
  size = 'editorial',
  className = '',
}: {
  children: ReactNode
  size?: ContainerSize
  className?: string
}) {
  return <div className={`mx-auto w-full px-6 ${MAX_WIDTH[size]} ${className}`}>{children}</div>
}

export function Section({
  id,
  children,
  className = '',
  bordered = true,
}: {
  id?: string
  children: ReactNode
  className?: string
  bordered?: boolean
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-24 md:py-32 ${bordered ? 'border-t border-hairline' : ''} ${className}`}
    >
      {children}
    </section>
  )
}

export function SectionHeading({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2
      className={`text-center font-display text-xs uppercase tracking-label text-muted ${className}`}
    >
      {children}
    </h2>
  )
}
