import type { FaqItem } from '../content/landings'
import { Container, Section, SectionHeading } from '../ui/section'

export function Faq({
  items,
  id = 'faq',
  heading = 'Preguntas frecuentes',
}: {
  items: FaqItem[]
  id?: string
  heading?: string
}) {
  return (
    <Section id={id}>
      <Container>
        <SectionHeading>{heading}</SectionHeading>
        <div className="mt-16 border-y border-hairline divide-y divide-hairline">
          {items.map((item) => (
            <details key={item.q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  )
}
