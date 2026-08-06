import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'

// Point 8 — le not-found racine : Next ne sert PAS le not-found.tsx d'un
// segment dynamique pour une URL inconnue (le 404 par défaut prenait le
// dessus). Celui-ci couvre toute route inconnue, toutes locales : la locale
// est résolue depuis x-pathname (posé par le middleware proxy.ts).
const LOCALES = ['fr', 'en', 'ar', 'tzm'] as const

export default async function NotFound() {
  let locale: string = 'fr'
  try {
    const h = await headers()
    const path = h.get('x-pathname') || ''
    const seg = path.split('/')[1]
    if ((LOCALES as readonly string[]).includes(seg)) locale = seg
  } catch {
    // headers() indisponible (statique) → fr
  }

  const t = await getTranslations({ locale: locale as 'fr' | 'en' | 'ar' | 'tzm', namespace: 'notFound' })

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-cream-100 px-4 text-center">
      <div className="mx-auto max-w-md">
        <p className="font-heading text-6xl font-bold text-primary-600">404</p>
        <h1 className="mt-4 font-heading text-3xl font-bold text-stone-800">{t('title')}</h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-500">{t('description')}</p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-800"
        >
          {t('back')}
        </Link>
      </div>
    </div>
  )
}
