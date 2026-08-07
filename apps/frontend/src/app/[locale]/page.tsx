import { setRequestLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { MapPin, Star, Stethoscope, ArrowRight, BadgeCheck, Languages } from "lucide-react";
import PresentationSection from "@/components/sections/PresentationSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ReviewsSection from "@/components/sections/ReviewsSection";
import PublicBookingWidget from "@/components/booking/PublicBookingWidget";
import InfosSection from "@/components/sections/InfosSection";
import ClosureBanner from "@/components/sections/ClosureBanner";
import { getServices, getPracticeInfo, getReviews, getTenantById, getDoctorProfile, resolveMediaUrl } from "@/lib/payload";
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

  const doctorName = doctor?.name || 'Dr Demo'
  const doctorPhotoUrl = resolveMediaUrl(
    typeof doctor?.photo === 'string' ? doctor.photo : doctor?.photo?.url,
  )
  const city = practiceInfo?.city || ''
  const specialty = doctor?.specialty || 'Pédiatre'

  return (
    <>
      <ClosureBanner closures={(practiceInfo?.exceptionalClosures ?? []) as any} />
      <main className="flex-1">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden px-4 pb-[60px] pt-[112px] md:pt-[130px]">
        {/* Blobs décoratifs : dégradés radiaux calibrés pour reproduire
            l'ampleur du rendu flouté original (340px/70% blur 60 → halo ~460px),
            SANS filter/blur — un filtre dans le flux de scroll crée un layer
            GPU (famille #166, guard A3). */}
        <span className="absolute left-[60%] -top-[100px] z-0 size-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(254,243,199,0.55),transparent)]" />
        <span className="absolute -bottom-[60px] -left-[80px] z-0 size-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(204,251,241,0.65),transparent)]" />

        <div className="container relative z-10 mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {city && (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold tracking-wide text-primary-700">
                  <MapPin className="size-3.5" />
                  {city}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold tracking-wide text-primary-700">
                <Stethoscope className="size-3.5" />
                {specialty}
              </span>
            </div>
            <h1 className="mb-5 max-w-[520px] font-heading text-[clamp(2.15rem,4vw,3.15rem)] font-extrabold leading-tight tracking-[-.01em] text-stone-800">
              {practiceInfo?.tagline || t('tagline')}
            </h1>
            <p className="mb-8 max-w-[480px] text-[1.08rem] text-stone-600">
              {t('subtitle') || `Consultations, suivi de croissance et vaccination, de la naissance à l'adolescence — cabinet pédiatrique installé à ${city || 'votre ville'}.`}
            </p>
            <div className="mb-6 flex flex-wrap gap-3.5">
              <a href={`/${locale}#rdv`}
                className="inline-flex items-center gap-2 rounded-full bg-cta-600 px-7 py-3.5 text-[.97rem] font-bold text-white shadow-sm transition-all duration-200 hover:bg-cta-700 hover:-translate-y-0.5 hover:shadow-md">
                {t('cta_primary')}
                <ArrowRight className="size-[18px]" />
              </a>
              <a href="/#presentation"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200/50 bg-white px-7 py-3.5 text-[.97rem] font-bold text-stone-800 transition-all duration-200 hover:border-primary-500 hover:text-primary-700">
                {t('cta_secondary')}
              </a>
            </div>
            <div className="flex flex-wrap gap-[18px] text-[.87rem] font-semibold text-[#B9B2A4]">
              {reviewsData.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-3.5 text-primary-500" />
                  {t('badge_rating', {
                    rating: (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length)
                      .toFixed(1)
                      .replace('.', ','),
                    count: reviewsData.length,
                  })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-primary-500" />
                {t('badge_experience')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="size-3.5 text-primary-500" />
                {t('badge_langues')}
              </span>
            </div>
          </div>

          <div className="relative order-first mx-auto w-full max-w-[280px] md:order-none md:max-w-[360px]">
            <div className="rounded-[28px] border border-stone-200/50 bg-white p-[26px_26px_20px] shadow-lg">
              <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200">
                {doctorPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doctorPhotoUrl}
                    alt={t('photoPlaceholder')}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <div className="flex size-[104px] items-center justify-center rounded-full bg-white/70 shadow-sm">
                      <Stethoscope className="size-12 text-primary-700" />
                    </div>
                    <span className="absolute bottom-3.5 right-3.5 rounded-full bg-stone-800/55 px-2.5 py-1 text-[.68rem] font-semibold text-white">
                      {t('photoPlaceholder')}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-4 text-center font-heading text-base font-bold text-stone-800">
                {doctorName}
                <span className="mt-0.5 block font-body text-[.85rem] font-medium text-stone-500">
                  {specialty} — {city.replace(', Souss-Massa', '')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <PresentationSection locale={locale} doctor={doctor} />

      <ServicesSection locale={locale} services={services} />

      <ReviewsSection reviews={reviewsData} locale={locale} />

      <PublicBookingWidget tenantId={tenantId} />

      <InfosSection locale={locale} practiceInfo={practiceInfo} />
      </main>
    </>
  );
}
