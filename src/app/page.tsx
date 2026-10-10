import type { Metadata } from 'next'
import { HOME_FAQ, STEPS } from '@/interface/content/home'
import { SITE } from '@/interface/content/site'
import { HomePage } from '@/interface/pages/home-page'
import { JsonLd } from '@/interface/seo/json-ld'

const SITE_URL = 'https://escala4x.local'

export const metadata: Metadata = {
  title: 'Escala imágenes 4x en tu navegador',
  description:
    'Aumenta la resolución de tus imágenes 4x con IA. Gratis, sin registro y 100% en el navegador: tus archivos no se suben a ningún servidor.',
  alternates: { canonical: '/' },
}

export default function Page() {
  const graph: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.brand,
      url: `${SITE_URL}/`,
      description: SITE.positioning,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Cómo escalar una imagen 4x en el navegador',
      step: STEPS.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.body,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ]

  return (
    <>
      {graph.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
      <HomePage />
    </>
  )
}
