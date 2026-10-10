import { TRUST } from '../content/home'
import { Container, Section, SectionHeading } from '../ui/section'

export function Trust() {
  return (
    <Section id="privacy">
      <Container size="narrow">
        <SectionHeading>{TRUST.title}</SectionHeading>
        <p className="mt-8 text-center text-sm leading-relaxed text-muted">{TRUST.body}</p>
      </Container>
    </Section>
  )
}
