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

const FR_TO_EN: Record<string, string> = {
  lun: "mon", lundi: "mon", mar: "tue", mardi: "tue",
  mer: "wed", mercredi: "wed", jeu: "thu", jeudi: "thu",
  ven: "fri", vendredi: "fri", sam: "sat", samedi: "sat",
  dim: "sun", dimanche: "sun",
};

function expandDays(raw: string): string[] {
  const clean = raw.trim().toLowerCase();
  const sep = clean.includes("–") ? "–" : clean.includes("-") ? "-" : null;
  if (sep) {
    const parts = clean.split(sep).map((s) => s.trim());
    const start = FR_TO_EN[parts[0]];
    const end = FR_TO_EN[parts[1]];
    if (start && end) {
      const si = DAY_ORDER.indexOf(start);
      const ei = DAY_ORDER.indexOf(end);
      if (si !== -1 && ei !== -1 && si <= ei) return DAY_ORDER.slice(si, ei + 1);
    }
    return parts.filter((p) => FR_TO_EN[p]).map((p) => FR_TO_EN[p]);
  }
  const mapped = FR_TO_EN[clean];
  return mapped ? [mapped] : [raw];
}

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
      const days = expandDays(s.day);
      for (const day of days) hoursMap.set(day, timeStr);
    }
  }

  const hoursStr = practiceInfo?.schedules
    ? practiceInfo.schedules.map(s => `${s.day} ${[s.open, s.close].filter(Boolean).join('–')}`).join('<br/>')
    : ''

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
                <p className="text-sm text-stone-400">Carte non disponible</p>
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
