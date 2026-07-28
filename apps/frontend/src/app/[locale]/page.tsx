import { setRequestLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { MapPin, Star, Stethoscope, ArrowRight } from "lucide-react";
import PresentationSection from "@/components/sections/PresentationSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ReviewsSection from "@/components/sections/ReviewsSection";
import PublicBookingWidget from "@/components/booking/PublicBookingWidget";
import InfosSection from "@/components/sections/InfosSection";
import { getServices, getPracticeInfo, getReviews, getTenantById, getDoctorProfile } from "@/lib/payload";
import type { Service, PracticeInfo, Review, Doctor } from "@/lib/payload";

const DATA_LOCALE: Record<string, string> = {
  fr: 'fr', en: 'en', ar: 'ar', tzm: 'fr',
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hero" });

  const h = await headers();
  const tenantId = h.get('x-tenant-id') || 'default';
  const dataLocale = DATA_LOCALE[locale] || 'fr'

  let services: Service[] = []
  let practiceInfo: PracticeInfo | null = null
  let reviewsData: Review[] = []
  let doctor: Doctor | null = null

  try {
    const results = await Promise.all([
      getServices(tenantId, dataLocale),
      getPracticeInfo(tenantId, dataLocale),
      getReviews(tenantId, dataLocale),
      getDoctorProfile(tenantId, dataLocale),
    ])
    services = results[0]
    practiceInfo = results[1]
    reviewsData = results[2]
    doctor = results[3]
  } catch (err) {
    console.error("=== [DEBUG FRONTEND] ERREUR FETCH CMS ===", err)
  }

  const doctorName = doctor?.name || 'Dr Guinane Aicha'
  const city = practiceInfo?.city || 'Inezgane, Souss-Massa'
  const specialty = doctor?.specialty || 'Pédiatre'

  return (
    <main className="flex-1">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden px-4 pb-[70px] pt-[132px] md:pt-[110px]">
        <span className="absolute left-[60%] -top-[100px] z-0 size-[340px] rounded-full bg-amber-100/70 blur-[60px]" />
        <span className="absolute -bottom-[60px] -left-[80px] z-0 size-[260px] rounded-full bg-primary-100/80 blur-[60px]" />

        <div className="container relative z-10 mx-auto grid max-w-[1200px] items-center gap-14 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-[.82rem] font-semibold text-primary-700">
              <MapPin className="size-3.5" />
              {city}
            </span>
            <h1 className="mb-[18px] max-w-[520px] font-heading text-[clamp(2rem,3.6vw,2.9rem)] font-extrabold leading-tight text-stone-800">
              {practiceInfo?.tagline || t('tagline')}
            </h1>
            <p className="mb-8 max-w-[480px] text-[1.08rem] text-stone-600">
              {t('subtitle') || "Consultations, suivi de croissance et vaccination, de la naissance à l'adolescence — cabinet pédiatrique installé à Inezgane."}
            </p>
            <div className="mb-6 flex flex-wrap gap-3">
              <a href={`/${locale}#rdv`}
                className="inline-flex items-center gap-2 rounded-xl bg-cta-700 px-[26px] py-3.5 text-[.95rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-800 hover:-translate-y-0.5 hover:shadow-md">
                {t('cta_primary')}
                <ArrowRight className="size-[17px]" />
              </a>
              <a href="/#presentation"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-400 bg-white px-[26px] py-3.5 text-[.95rem] font-semibold text-stone-600 shadow-sm transition-all duration-200 hover:bg-cream-200">
                {t('cta_secondary')}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[.87rem] font-medium text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                4,9/5 · 11 avis Google
              </span>
              <span className="size-1.5 rounded-full bg-primary-400" />
              <span>20 ans d'expérience</span>
              <span className="size-1.5 rounded-full bg-primary-400" />
              <span>{t('badge_langues')}</span>
            </div>
          </div>

          <div className="relative order-first mx-auto max-w-[280px] md:order-none md:max-w-[360px]">
            <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[26px] bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 shadow-lg">
              <div className="flex size-[104px] items-center justify-center rounded-full bg-white/70 shadow-sm">
                <Stethoscope className="size-12 text-primary-700" />
              </div>
              <span className="absolute bottom-3.5 right-3.5 rounded-full bg-stone-800/55 px-2.5 py-1 text-[.68rem] font-semibold text-white">
                Photo à intégrer
              </span>
            </div>
            <p className="mt-4 text-center font-heading text-base font-bold text-stone-800">
              {doctorName}
              <span className="mt-0.5 block font-body text-[.85rem] font-medium text-stone-500">
                {specialty} — {city.replace(', Souss-Massa', '').replace('Inezgane', 'Inezgane')}
              </span>
            </p>
          </div>
        </div>
      </section>

      <PresentationSection locale={locale} doctor={doctor} />

      <ServicesSection locale={locale} services={services} />

      <ReviewsSection reviews={reviewsData} locale={locale} />

      <PublicBookingWidget tenantId={tenantId} />

      <InfosSection locale={locale} practiceInfo={practiceInfo} />
    </main>
  );
}
