import { Link } from '@/i18n/navigation'
import { ArrowLeft } from 'lucide-react'

type Props = {
  locale: string
  title: string
  children: React.ReactNode
}

export default function LegalPage({ locale, title, children }: Props) {
  return (
    <div className="bg-cream-100 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 pt-[130px] pb-14 md:px-6">
        <Link
          href="/landing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;accueil
        </Link>

        {locale !== 'fr' && (
          <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
            Ce document légal est disponible en français.
          </p>
        )}

        <h1 className="mt-6 font-heading text-3xl font-bold text-stone-800">{title}</h1>

        <div className="mt-8 space-y-6 text-[.95rem] leading-relaxed text-stone-700 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-stone-800 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:text-stone-800 [&_th]:py-2 [&_th]:px-3 [&_th]:border [&_th]:border-stone-200 [&_th]:bg-stone-50 [&_td]:py-2 [&_td]:px-3 [&_td]:border [&_td]:border-stone-200">
          {children}
        </div>
      </div>
    </div>
  )
}
