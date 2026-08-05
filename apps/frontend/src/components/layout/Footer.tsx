import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { headers } from 'next/headers'
import { getDoctorProfile, getPracticeInfo } from '@/lib/payload'

const DATA_LOCALE: Record<string, string> = {
  fr: 'fr', en: 'en', ar: 'ar', tzm: 'fr',
}

type Props = {
  locale: string;
};

export default async function Footer({ locale }: Props) {
  const n = await getTranslations({ locale, namespace: "nav" });

  const h = await headers()
  const tenantId = h.get('x-tenant-id') || 'default'
  const dataLocale = DATA_LOCALE[locale] || 'fr'

  const [doctor, practiceInfo] = await Promise.all([
    getDoctorProfile(tenantId, dataLocale),
    getPracticeInfo(tenantId, dataLocale),
  ])

  const doctorName = doctor?.name || ''
  const specialty = doctor?.specialty || ''
  const city = practiceInfo?.city || ''

  const navLinks = [
    { href: "/", key: "home" },
    { href: "/#presentation", key: "presentation" },
    { href: "/#services", key: "services" },
    { href: "/#reviews", key: "reviews" },
    { href: "/#infos", key: "infos" },
  ] as const;

  return (
    <footer>
      <div className="h-2 bg-gradient-to-b from-cream-100 to-primary-800" />
      <div className="bg-primary-800">
        <div className="mx-auto max-w-[1160px] px-6 py-6">
          <div className="flex flex-col items-center gap-4 text-center md:grid md:grid-cols-3 md:items-center">
            <p className="text-sm font-medium text-stone-300 md:text-start">
              {doctorName}{doctorName && specialty ? ' — ' : ''}
              <span className="font-normal text-stone-200">{specialty}</span>
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
              {navLinks.map(({ href, key }) => (
                <Link key={key} href={href} className="text-stone-200 transition-colors duration-200 hover:text-white">
                  {n(key)}
                </Link>
              ))}
            </nav>
            <p className="text-sm text-stone-200 md:text-end">{city}</p>
          </div>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-stone-400 transition-colors duration-200 hover:text-stone-200">
              Espace praticien
            </Link>
          </div>
          {doctorName && (
            <p className="mt-6 text-center text-xs text-stone-300">
              &copy; {new Date().getFullYear()} {doctorName}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
