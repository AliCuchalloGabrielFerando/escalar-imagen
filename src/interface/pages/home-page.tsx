import { HERO, HOME_FAQ } from '../content/home'
import { Features } from '../sections/features'
import { Faq } from '../sections/faq'
import { HowItWorks } from '../sections/how-it-works'
import { Trust } from '../sections/trust'
import { UseCases } from '../sections/use-cases'
import { ToolSection } from '../tool/tool-section'
import { Container } from '../ui/section'

export function HomePage() {
  return (
    <>
      <section className="pb-24 pt-20 md:pb-32 md:pt-28">
        <Container className="text-center">
          <h1 className="mx-auto max-w-3xl font-display text-2xl uppercase tracking-label md:text-4xl">
            {HERO.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            {HERO.subtitle}
          </p>
        </Container>

        <Container size="tool" className="mt-14 text-left">
          <ToolSection />
        </Container>
      </section>

      <HowItWorks />
      <UseCases />
      <Trust />
      <Faq items={HOME_FAQ} />
      <Features />
    </>
  )
}
