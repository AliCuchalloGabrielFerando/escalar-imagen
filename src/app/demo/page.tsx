import type { Metadata } from 'next'
import { LANDINGS } from '@/interface/content/landings'
import { SeoLandingPage } from '@/interface/pages/seo-landing-page'
import { JsonLd } from '@/interface/seo/json-ld'

const SITE_URL = 'https://escala4x.local'
const landing = LANDINGS['escalar-imagen-4x']

export const metadata: Metadata = {
  title: landing.title,
  description: landing.description,
  alternates: { canonical: landing.path },
}

export default function Page() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: landing.h1, item: `${SITE_URL}${landing.path}` },
    ],
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: landing.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Escala4x',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  }

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <JsonLd data={app} />
      <SeoLandingPage landing={landing} />
    </>
  )
}
