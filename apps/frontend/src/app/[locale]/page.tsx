import { setRequestLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import PresentationSection from "@/components/sections/PresentationSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ReviewsSection from "@/components/sections/ReviewsSection";
import PublicBookingWidget from "@/components/booking/PublicBookingWidget";
import InfosSection from "@/components/sections/InfosSection";
import { getServices, getPracticeInfo, getReviews, getTenantById, getDoctorProfile } from "@/lib/payload";
import type { Service, PracticeInfo, Review, Doctor, Tenant } from "@/lib/payload";

const DATA_LOCALE: Record<string, string> = {
  fr: 'fr',
  en: 'en',
  ar: 'ar',
  tzm: 'fr',
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
  let tenant: Tenant | null = null
  let doctor: Doctor | null = null

  try {
    const results = await Promise.all([
      getServices(tenantId, dataLocale),
      getPracticeInfo(tenantId, dataLocale),
      getReviews(tenantId, dataLocale),
      getTenantById(tenantId),
      getDoctorProfile(tenantId, dataLocale),
    ])
    services = results[0]
    practiceInfo = results[1]
    reviewsData = results[2]
    tenant = results[3]
    doctor = results[4]
  } catch (err) {
    console.error("=== [DEBUG FRONTEND] ERREUR FETCH CMS ===", err)
  }

  console.log("=== [DEBUG FRONTEND] RETOUR CMS PAYLOAD ===");
  console.log("practiceInfo:", JSON.stringify(practiceInfo, null, 2));
  console.log("doctor:", JSON.stringify(doctor, null, 2));

  return (
    <main className="flex-1">
      <section className="flex min-h-screen items-center bg-cream-100 px-4 pt-24 pb-16 transition-colors duration-300 md:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-6">
            {t("badge_location") && (
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200">
                <span className="size-1.5 rounded-full bg-primary-500" />
                {t("badge_location")}
              </div>
            )}

            <h1 className="font-heading max-w-lg text-4xl font-bold leading-tight text-stone-800 md:text-5xl lg:text-6xl">
              {practiceInfo?.tagline || t("tagline")}
            </h1>

            {t("subtitle") && (
              <p className="max-w-md text-lg leading-relaxed text-stone-500">
                {t("subtitle")}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/#rdv"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-cta-700 px-6 text-base font-bold text-white shadow-sm transition-colors duration-200 hover:bg-cta-800"
              >
                {t("cta_primary")}
              </Link>
              <Link
                href="/#presentation"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 text-base font-medium text-stone-700 shadow-sm transition-colors duration-200 hover:bg-cream-200"
              >
                {t("cta_secondary")}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-600">
              {t("badge_conventionnee") && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary-400" />
                  {t("badge_conventionnee")}
                </span>
              )}
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary-400" />
                {t("badge_langues")}
              </span>
            </div>
          </div>

          <div className="relative hidden md:flex items-center justify-center">
            <div className="absolute -left-8 -top-8 size-72 rounded-full bg-amber-100/40" />
            <div className="absolute -right-4 -bottom-4 size-48 rounded-full bg-primary-100/50" />
            <div className="relative z-10 aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 shadow-xl" />
          </div>
        </div>
      </section>

      <PresentationSection locale={locale} doctor={doctor} />

      <ServicesSection locale={locale} services={services} />

      <ReviewsSection reviews={reviewsData} locale={locale} />

      <PublicBookingWidget />

      <InfosSection locale={locale} practiceInfo={practiceInfo} />
    </main>
  );
}
