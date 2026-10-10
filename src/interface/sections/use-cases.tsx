import Link from 'next/link'
import { USE_CASES } from '../content/home'
import { Container, Section, SectionHeading } from '../ui/section'

export function UseCases() {
  return (
    <Section id="use-cases">
      <Container>
        <SectionHeading>Casos de uso</SectionHeading>
        <div className="mt-16 grid border-t border-hairline sm:grid-cols-2">
          {USE_CASES.map((useCase, index) => (
            <Link
              key={useCase.title}
              href={useCase.href}
              className={`group border-b border-hairline py-8 ${
                index % 2 === 1 ? 'sm:border-l sm:pl-8' : 'sm:pr-8'
              }`}
            >
              <p className="text-sm font-medium">{useCase.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{useCase.body}</p>
              <span className="mt-4 inline-block text-xs uppercase tracking-label text-faint transition-colors group-hover:text-ink">
                Probar →
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  )
}
