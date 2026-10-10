import Link from 'next/link'
import type { Landing } from '../content/landings'
import { Features } from '../sections/features'
import { Faq } from '../sections/faq'
import { ToolSection } from '../tool/tool-section'
import { Container, Section, SectionHeading } from '../ui/section'

export function SeoLandingPage({ landing }: { landing: Landing }) {
  return (
    <>
      <section className="pb-24 pt-20 md:pb-32 md:pt-28">
        <Container className="text-center">
          <h1 className="mx-auto max-w-3xl font-display text-2xl uppercase tracking-label md:text-4xl">
            {landing.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            {landing.description}
          </p>
        </Container>

        <Container size="tool" className="mt-14 text-left">
          <ToolSection />
        </Container>
      </section>

      <Section>
        <Container>
          <div className="space-y-6 text-sm leading-relaxed text-muted">
            {landing.intro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </Container>
      </Section>

      <Faq items={landing.faq} />

      <Section id="related">
        <Container>
          <SectionHeading>Relacionado</SectionHeading>
          <div className="mt-16 border-y border-hairline divide-y divide-hairline">
            {landing.related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between py-6 text-sm transition-colors hover:text-ink"
              >
                {link.label}
                <span className="text-faint">→</span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Features />
    </>
  )
}
