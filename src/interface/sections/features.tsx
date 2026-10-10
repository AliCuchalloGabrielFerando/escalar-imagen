import { FEATURES } from '../content/home'
import { Container, Section, SectionHeading } from '../ui/section'

export function Features({ id = 'features' }: { id?: string }) {
  return (
    <Section id={id}>
      <Container>
        <SectionHeading>Características</SectionHeading>
        <div className="mt-16 border-y border-hairline divide-y divide-hairline">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="grid gap-4 py-8 md:grid-cols-[240px_1fr] md:gap-12">
              <p className="text-xs uppercase tracking-label">{feature.title}</p>
              <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
