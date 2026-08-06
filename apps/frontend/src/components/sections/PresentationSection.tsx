import { getTranslations } from 'next-intl/server'
import type { Doctor } from '@/lib/payload'

type Props = {
  locale: string
  doctor: Doctor | null
}

const timeline = [
  { title: 'Faculté de médecine', description: 'Diplôme de médecine' },
  { title: 'Formation hospitalière', description: 'Spécialisation en pédiatrie' },
  { title: 'Pratique libérale', description: "Aujourd'hui" },
]

export default async function PresentationSection({ locale, doctor }: Props) {
  const t = await getTranslations({ locale, namespace: 'presentation' })
  if (!doctor) return null

  return (
    <section className="scroll-mt-24 px-4 py-[68px] md:py-[104px]" id="presentation">
      <div className="container mx-auto max-w-[1160px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            {t('title')}
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            Une pédiatrie attentive, dédiée au bien-être des enfants
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
              {doctor.bio?.trim() ||
                `Le ${doctor.name} est pédiatre et reçoit les enfants de la naissance à l'adolescence, dans une approche attentive et bienveillante.`}
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
