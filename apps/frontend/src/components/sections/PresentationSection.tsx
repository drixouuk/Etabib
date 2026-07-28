import { getTranslations } from 'next-intl/server'
import type { Doctor } from '@/lib/payload'

type Props = {
  locale: string
  doctor: Doctor | null
}

const timeline = [
  { title: 'Faculté de Médecine de Casablanca', description: 'Diplôme de médecine' },
  { title: 'CHU Ibn Rochd, Casablanca', description: 'Médecin' },
  { title: 'Hôpital Régional de Biougra', description: 'Cheffe du service de pédiatrie' },
  { title: 'Cabinet à Inezgane', description: "Aujourd'hui" },
]

export default async function PresentationSection({ locale, doctor }: Props) {
  const t = await getTranslations({ locale, namespace: 'presentation' })
  if (!doctor) return null

  return (
    <section className="scroll-mt-24 px-4 py-[88px] md:py-[60px]" id="presentation">
      <div className="container mx-auto max-w-[1200px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            {t('title')}
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            20 ans dédiés au bien-être des enfants
          </h2>
        </div>

        <div className="grid items-start gap-14 md:grid-cols-[.85fr_1.15fr]">
          <div>
            <h3 className="mb-5 font-heading text-[1.05rem] font-bold text-stone-800">Parcours</h3>
            <div className="relative pl-[26px]">
              <div className="absolute left-[5px] top-1.5 bottom-1.5 w-0.5 bg-stone-200" />
              {timeline.map((item) => (
                <div key={item.title} className="relative pb-[26px] last:pb-0">
                  <div className="absolute -left-[26px] top-0.5 size-3 rounded-full border-[3px] border-cream-100 bg-primary-600 shadow-[0_0_0_1px_var(--color-primary-200)]" />
                  <h4 className="text-[.95rem] font-bold text-stone-800">{item.title}</h4>
                  <p className="text-[.86rem] text-stone-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-heading text-[1.05rem] font-bold text-stone-800">Approche</h3>
            <p className="mb-4 text-[1.03rem] text-stone-600">
              Le {doctor?.name || 'Dr Guinane Aicha'} est un{doctor?.name?.startsWith('Dr') ? 'e' : ''} pédiatre expérimenté{doctor?.name?.startsWith('Dr') ? 'e' : ''}, dédié au bien-être des enfants de la naissance à l&apos;adolescence. Formé{doctor?.name?.startsWith('Dr') ? 'e' : ''} à Casablanca et fort{doctor?.name?.startsWith('Dr') ? 'e' : ''} de vingt années de pratique hospitalière et libérale, {doctor?.name?.startsWith('Dr') ? 'elle' : 'il'} accompagne aujourd&apos;hui les familles de la région Souss-Massa.
            </p>
            <p className="mb-4 text-[1.03rem] text-stone-600">
              Sa pratique privilégie une médecine attentive, bienveillante et à l&apos;écoute — une approche que ses patients soulignent régulièrement dans leurs avis.
            </p>
            <span className="mt-6 inline-flex rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-[.88rem] font-semibold text-primary-700">
              {doctor.specialty || 'Pédiatre'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
