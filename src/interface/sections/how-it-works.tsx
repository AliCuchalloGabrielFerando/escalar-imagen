import { STEPS } from '../content/home'
import { Container, Section, SectionHeading } from '../ui/section'

export function HowItWorks() {
  return (
    <Section id="how">
      <Container>
        <SectionHeading>Cómo funciona</SectionHeading>
        <div className="mt-16 border-y border-hairline divide-y divide-hairline">
          {STEPS.map((step, index) => (
            <div key={step.title} className="grid gap-4 py-8 md:grid-cols-[240px_1fr] md:gap-12">
              <p className="text-xs uppercase tracking-label text-muted">
                <span className="text-faint">{String(index + 1).padStart(2, '0')}</span>
                {' · '}
                {step.title}
              </p>
              <p className="text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
