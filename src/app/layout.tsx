import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { DevCleanup } from '@/interface/dev/dev-cleanup'
import { SiteFooter } from '@/interface/layout/site-footer'
import { SiteHeader } from '@/interface/layout/site-header'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://escala4x.local'),
  title: {
    default: 'Escala4x · Escalado de imágenes 4x en tu navegador',
    template: '%s · Escala4x',
  },
  description:
    'Escala imágenes 4x con IA directamente en tu navegador. Gratis, sin subir archivos a ningún servidor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <head>
        {/* Applies the saved/system theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <DevCleanup />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
