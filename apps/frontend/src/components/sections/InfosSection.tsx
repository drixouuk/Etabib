import { getTranslations } from "next-intl/server";
import {
  MapPin,
  Clock,
  CreditCard,
  Phone,
  Mail,
} from "lucide-react";
import ContactForm from "@/components/ui/ContactForm";
import type { PracticeInfo } from "@/lib/payload";

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// dayOfWeek ISO : 1=Lundi … 7=Dimanche → index DAY_ORDER
const ISO_TO_DAY_ORDER: Record<number, string> = {
  1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 7: "sun",
};

type Props = { locale: string; practiceInfo: PracticeInfo | null };

export default async function InfosSection({ locale, practiceInfo }: Props) {
  const t = await getTranslations({ locale, namespace: "infos" });
  const d = await getTranslations({ locale, namespace: "infos.days" });
  const c = await getTranslations({ locale, namespace: "contact" });

  const hoursMap = new Map<string, string>();
  if (practiceInfo?.schedules) {
    for (const s of practiceInfo.schedules) {
      const timeParts = [s.open, s.close].filter(Boolean);
      const timeStr = timeParts.length === 2 ? `${timeParts[0]}–${timeParts[1]}` : timeParts[0] || "";
      const day = ISO_TO_DAY_ORDER[Number(s.dayOfWeek)];
      if (day) hoursMap.set(day, timeStr);
    }
  }

  const hoursStr = practiceInfo?.schedules
    ? practiceInfo.schedules
        .map(s => `${ISO_TO_DAY_ORDER[Number(s.dayOfWeek)] || ''} ${[s.open, s.close].filter(Boolean).join('–')}`)
        .join('<br/>')
    : ''

  // Fermetures à venir (pas encore commencées aujourd'hui)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingClosures = (practiceInfo?.exceptionalClosures ?? []).filter((c: any) => {
    const start = new Date(c.startDate)
    start.setHours(0, 0, 0, 0)
    return start >= today
  })

  const infoCards = [
    { icon: MapPin, title: t("address_title"), text: practiceInfo?.address || '' },
    { icon: Clock, title: t("hours_title"), text: hoursStr || t("hours_note"), html: true },
    { icon: CreditCard, title: t("fees_title"), text: `${practiceInfo?.paymentNote || t("payment")}.` },
    { icon: Phone, title: "Téléphone", text: practiceInfo?.phone || '' },
  ]

  return (
    <section className="scroll-mt-24 px-4 py-[88px] md:py-[60px]" id="infos">
      <div className="container mx-auto max-w-[1200px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            Infos
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            Informations pratiques
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {infoCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="rounded-2xl border border-stone-200 bg-white p-[26px]">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon className="size-[22px]" />
                </div>
                <h4 className="mb-1.5 font-heading text-base font-bold text-stone-800">{card.title}</h4>
                {card.html ? (
                  <p className="text-[.89rem] text-stone-600" dangerouslySetInnerHTML={{ __html: card.text }} />
                ) : (
                  <p className="text-[.89rem] text-stone-600">{card.text}</p>
                )}
              </div>
            )
          })}
        </div>

        {upcomingClosures.length > 0 && (
          <div className="mx-auto mt-6 max-w-[620px] rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-bold text-amber-800">Fermetures à venir</p>
            <ul className="mt-1.5 space-y-1">
              {upcomingClosures.map((c: any, i: number) => {
                const start = new Date(c.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                const end = c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null
                return (
                  <li key={i} className="text-sm text-amber-800">
                    {c.label} — {start}{end ? ` au ${end}` : ''}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {practiceInfo?.coordinates?.lat && practiceInfo?.coordinates?.lng ? (
              <iframe
                src={`https://www.google.com/maps?q=${practiceInfo.coordinates.lat},${practiceInfo.coordinates.lng}&z=17&output=embed`}
                width="100%" height="100%" style={{ border: 0, minHeight: 280 }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                title="Cabinet médical"
              />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center bg-stone-50">
                <p className="text-sm text-stone-500">Carte non disponible</p>
              </div>
            )}
            <div className="flex items-center gap-2 border-t border-stone-200 px-5 py-3 text-sm text-stone-500">
              <MapPin className="size-4 text-primary-600" />
              {practiceInfo?.address || 'Inezgane'}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="mb-1.5 font-heading text-base font-bold text-stone-800">
              <Mail className="mr-2 inline size-4 text-primary-600" />
              {c("title")}
            </h3>
            <ContactForm locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
