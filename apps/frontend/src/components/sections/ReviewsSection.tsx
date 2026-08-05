"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import type { Review } from "@/lib/payload";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-[13px] ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
      ))}
    </div>
  );
}

type Props = {
  reviews: Review[];
  locale: string;
};

export default function ReviewsSection({ reviews, locale }: Props) {
  const t = useTranslations("reviews");
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Point 9 — l'avance automatique est désactivée sous prefers-reduced-motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const track = trackRef.current;
    if (!track) return;
    const interval = setInterval(() => {
      if (paused) return;
      const card = track.firstElementChild as HTMLElement | null;
      if (!card) return;
      const cardWidth = card.offsetWidth + 20;
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 1) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [paused]);

  if (reviews.length === 0) return null;

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
  // Point 2 — note au format de la locale active (4.9 en EN, 4,9 en FR/AR).
  const formattedRating = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(avgRating)
  // Point 2 — date au format de la locale, jamais d'ISO brute dans le DOM.
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

  return (
    <section id="reviews" className="scroll-mt-24 px-4 py-[68px] md:py-[104px]" style={{ background: 'linear-gradient(180deg, #FFFBF0, #fff)' }}>
      <div className="container mx-auto max-w-[1160px]">
        <div className="mx-auto mb-8 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            {t('title')}
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            {t('heading')}
          </h2>
          <div className="mt-3 flex items-center justify-center gap-3.5 flex-wrap">
            <span className="font-heading text-[2.6rem] font-extrabold text-stone-800">{formattedRating}</span>
            <div>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-[19px] fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-[.92rem] font-semibold text-stone-500">{t('countLabel', { count: reviews.length })}</p>
            </div>
          </div>
        </div>

        <div
          ref={trackRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="flex gap-5 overflow-x-auto px-1 py-2 pb-4 snap-x snap-mandatory scrollbar-none"
        >
          {reviews.map((r) => (
            <div key={r.id} className="flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-stone-200 bg-cream-100 p-[22px]">
              <div className="flex items-center gap-[11px]">
                <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-[.9rem] font-bold text-white">
                  {r.author[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[.9rem] font-bold text-stone-800">{r.author}</p>
                  <StarRating rating={r.rating} />
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <span className="flex size-[15px] items-center justify-center rounded-full bg-[#4285F4] text-[9px] font-extrabold text-white">G</span>
                  <span className="text-[.72rem] text-stone-500">{t('google')}</span>
                </div>
              </div>
              <p className="flex-1 text-[.89rem] leading-relaxed text-stone-600 before:mr-0.5 before:text-primary-300 before:font-serif before:text-[1.3rem] before:content-['\201C']">{r.text}</p>
              <p className="text-[.76rem] text-stone-500">{formatDate(r.date)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
