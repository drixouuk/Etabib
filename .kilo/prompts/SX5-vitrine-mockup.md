# LOT SX-5 — Refonte vitrine publique (maquette → code)

## Contexte

Remplacer le site vitrine actuel par la maquette `docs/Maquette/dr-guinane-vitrine.html`. **Zéro déviation visuelle.** La maquette est la source unique de vérité pour le placement, les couleurs, les espacements et les animations.

## Règles globales

1. **i18n conservé** : le site vitrine public reste multilingue (fr/en/ar/tzm). Les textes viennent des `messages/*.json` existants. Ne pas ajouter de nouvelles clés sauf si le contenu est nouveau (ex: rating, trust indicators).
2. **Design tokens** : mapper les variables de la maquette vers nos tokens existants (voir table ci-dessous).
3. **Polices** : Figtree (headings) + Noto Sans (body) — déjà configurées dans `layout.tsx`.
4. **Scroll reveal** : animation `opacity:0 → opacity:1` + `translateY(20px → 0)` au scroll. Utiliser `IntersectionObserver` dans un composant client ou des classes CSS.
5. **Responsive** : la maquette définit des breakpoints à 860px, 900px, 768px, 520px. Utiliser les breakpoints Tailwind `md` (768px) et `lg` (1024px) par défaut, sauf indication contraire.

## Design token mapping (maquette → MASTER.md)

| Maquette | Token projet |
|----------|-------------|
| `--cream-100: #FFFBF0` | `cream-100` |
| `--cream-200: #FFF7E0` | `cream-200` |
| `--teal-50` → `--teal-700` | `primary-50` → `primary-700` |
| `--teal-800: #115E59` | `primary-800` |
| `--amber-100` → `--amber-500` | `amber-50` → `amber-500` |
| `--orange-700: #C2410C` | `cta-700` |
| `--orange-800: #9A3412` | `cta-800` |
| `--ink: #292524` | `stone-800` |
| `--ink-soft: #57534E` | `stone-600` |
| `--ink-faint: #78716C` | `stone-500` |
| `--ink-line: #A8A29E` | `stone-400` |
| `--border: #E7E5E4` | `stone-200` |
| `--white: #FFFFFF` | `white` |
| `--shadow-sm/md/lg` | Utiliser les classes Tailwind `shadow-sm/md/lg` |
| `--radius-sm: 12px` | `rounded-xl` |
| `--radius-md: 20px` | `rounded-2xl` |
| `--radius-lg: 28px` | `rounded-3xl` |

---

## Étape 1 — Header (floating navbar)

**Fichier** : `apps/frontend/src/components/layout/Header.tsx`

Refonte complète pour correspondre à la maquette (lignes 252-278) :

### 1a. Structure desktop

```tsx
<header className="navbar-floating transition-transform duration-300" id="navbar">
  <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md md:px-4">
    {/* Brand */}
    <Link href="/" className="flex items-center gap-2.5 font-heading text-base font-bold text-primary-700">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
        <Heart className="size-[17px] text-white" />
      </span>
      <span className="hidden sm:inline">{doctorName}</span>
      <span className="sm:hidden">{doctorNameShort}</span>
    </Link>

    {/* Nav links — desktop */}
    <div className="hidden items-center gap-0.5 md:flex">
      {navLinks.map(({ href, key }) => (
        <Link key={href} href={href}
          className="rounded-lg px-[13px] py-2.5 text-[.92rem] font-medium text-stone-600 transition-colors duration-150 hover:bg-cream-200 hover:text-primary-700">
          {t(key)}
        </Link>
      ))}
    </div>

    {/* Right side */}
    <div className="flex items-center gap-2.5">
      <LanguageSwitcher />
      <a href={`/${locale}#rdv`}
        className="hidden h-10 items-center justify-center rounded-xl bg-cta-700 px-[18px] text-[.87rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-800 hover:-translate-y-0.5 hover:shadow-md md:inline-flex">
        {t('cta')}
      </a>
      {/* Hamburger — mobile */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="flex size-[34px] items-center justify-center rounded-lg md:hidden" aria-label="Menu">
        {mobileMenuOpen ? <X className="size-[21px]" /> : <Menu className="size-[21px]" />}
      </button>
    </div>

    {/* Mobile panel */}
    {mobileMenuOpen && (
      <div className="absolute left-4 right-4 top-full mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:hidden">
        {navLinks.map(({ href, key }) => (
          <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-[14px] py-[11px] text-[.92rem] font-medium text-stone-600 hover:bg-cream-200">
            {t(key)}
          </Link>
        ))}
        <a href={`/${locale}#rdv`} onClick={() => setMobileMenuOpen(false)}
          className="block rounded-lg px-[14px] py-[11px] text-[.92rem] font-bold text-cta-700">
          {t('cta')}
        </a>
      </div>
    )}
  </nav>
</header>
```

### 1b. Comportement scroll

Remplacer la logique `useScrollDirection` actuelle par celle de la maquette : navbar se cache au scroll vers le bas (dès 100px), réapparaît au scroll vers le haut. Déjà partiellement implémenté via le hook `useScrollDirection` — vérifier que les classes correspondent.

---

## Étape 2 — Hero section

**Fichier** : `apps/frontend/src/app/[locale]/page.tsx`

Remplacer le bloc hero actuel (lignes ~60-116) par la structure maquette (lignes 282-308) :

```tsx
<section className="relative overflow-hidden px-4 pb-[70px] pt-[132px] md:pt-[110px]">
  {/* Blobs décoratifs */}
  <span className="absolute left-[60%] -top-[100px] z-0 size-[340px] rounded-full bg-amber-100/70 blur-[60px]" />
  <span className="absolute -bottom-[60px] -left-[80px] z-0 size-[260px] rounded-full bg-primary-100/80 blur-[60px]" />

  <div className="container relative z-10 mx-auto grid max-w-[1200px] items-center gap-14 md:grid-cols-2">
    {/* Copy */}
    <div>
      <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-[.82rem] font-semibold text-primary-700">
        <MapPin className="size-3.5" />
        {practiceInfo?.city || 'Inezgane, Souss-Massa'}
      </span>
      <h1 className="mb-[18px] max-w-[520px] font-heading text-[clamp(2rem,3.6vw,2.9rem)] font-extrabold leading-tight text-stone-800">
        {practiceInfo?.tagline || t('tagline')}
      </h1>
      <p className="mb-8 max-w-[480px] text-[1.08rem] text-stone-600">
        {t('hero_description') || 'Consultations, suivi de croissance et vaccination, de la naissance à l\'adolescence — cabinet pédiatrique installé à Inezgane.'}
      </p>
      <div className="mb-6 flex flex-wrap gap-3">
        <a href={`/${locale}#rdv`} className="btn-cta inline-flex items-center gap-2 rounded-xl bg-cta-700 px-[26px] py-3.5 text-[.95rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-800 hover:-translate-y-0.5 hover:shadow-md">
          {t('cta_primary')}
          <ArrowRight className="size-[17px]" />
        </a>
        <a href={`/${locale}#presentation`} className="btn-outline inline-flex items-center gap-2 rounded-xl border border-stone-400 bg-white px-[26px] py-3.5 text-[.95rem] font-semibold text-stone-600 shadow-sm transition-all duration-200 hover:bg-cream-200">
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

    {/* Portrait placeholder */}
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
        {doctor?.name || 'Dr Guinane Aicha'}
        <span className="mt-0.5 block font-body text-[.85rem] font-medium text-stone-500">
          {doctor?.specialty || 'Pédiatre'} — {practiceInfo?.city || 'Inezgane'}
        </span>
      </p>
    </div>
  </div>
</section>
```

> **Note** : remplacer les icônes SVG inline par Lucide (`MapPin`, `Star`, `Stethoscope`, `ArrowRight`). Ajouter les imports correspondants.

---

## Étape 3 — Présentation (timeline + approche)

**Fichier** : `apps/frontend/src/components/sections/PresentationSection.tsx`

Refonte pour correspondre à la maquette (lignes 312-335). Structure actuelle à remplacer :

- **Gauche** : timeline verticale avec 4 items (ligne, points teal)
- **Droite** : texte approche en 2 paragraphes + pill "Pédiatre" en bas
- Breakpoint mobile : les 2 colonnes s'empilent

```tsx
<section className="scroll-mt-24 px-4 py-[88px] md:py-[60px]" id="presentation">
  <div className="container mx-auto max-w-[1200px]">
    <div className="mx-auto mb-12 max-w-[620px] text-center">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
        Présentation
      </span>
      <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
        20 ans dédiés au bien-être des enfants
      </h2>
    </div>

    <div className="grid items-start gap-14 md:grid-cols-[.85fr_1.15fr]">
      {/* Timeline */}
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

      {/* Approche */}
      <div>
        <h3 className="mb-5 font-heading text-[1.05rem] font-bold text-stone-800">Approche</h3>
        <p className="mb-4 text-[1.03rem] text-stone-600">{firstParagraph}</p>
        <p className="mb-4 text-[1.03rem] text-stone-600">{secondParagraph}</p>
        <span className="mt-6 inline-flex rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-[.88rem] font-semibold text-primary-700">
          {doctor?.specialty || 'Pédiatre'}
        </span>
      </div>
    </div>
  </div>
</section>
```

---

## Étape 4 — Services

**Fichier** : `apps/frontend/src/components/sections/ServicesSection.tsx`

Refonte pour correspondre à la maquette (lignes 339-355). Fond blanc, bordure top/bottom, grid 3 colonnes.

```tsx
<section id="services" className="scroll-mt-24 border-y border-stone-200 bg-white px-4 py-[88px] md:py-[60px]">
  <div className="container mx-auto max-w-[1200px]">
    <div className="mx-auto mb-12 max-w-[620px] text-center">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
        Services
      </span>
      <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
        Nos services
      </h2>
      <p className="mt-2.5 text-stone-600">Une prise en charge complète de votre enfant</p>
    </div>
    <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-[26px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Baby className="size-[22px]" />
          </div>
          <h3 className="mb-1.5 font-heading text-base font-bold text-stone-800">{s.title}</h3>
          <p className="text-[.89rem] text-stone-600">{s.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

> **Note** : mapper l'icône de chaque service via un objet `iconMap` basé sur `s.icon` (le champ Payload). Ex: `{ baby: <Baby />, syringe: <Syringe />, ... }`.

---

## Étape 5 — Avis (section signature)

**Fichier** : `apps/frontend/src/components/sections/ReviewsSection.tsx`

Refonte pour correspondre à la maquette (lignes 358-404). Structure signature : rating hero (4.9/5) + carousel horizontal auto-scroll + Google badge.

```tsx
<section className="scroll-mt-24 px-4 py-[88px] md:py-[60px]" id="avis" style={{ background: 'linear-gradient(180deg, #FFFBF0, #fff)' }}>
  <div className="container mx-auto max-w-[1200px]">
    <div className="mx-auto mb-8 max-w-[620px] text-center">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
        Avis
      </span>
      <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
        Ce que disent nos patients
      </h2>
      <div className="mt-3 flex items-center justify-center gap-3.5 flex-wrap">
        <span className="font-heading text-[2.6rem] font-extrabold text-stone-800">4,9</span>
        <div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => <Star key={i} className="size-[19px] fill-amber-400 text-amber-400" />)}
          </div>
          <p className="text-[.92rem] font-semibold text-stone-500">sur {reviews.length} avis Google</p>
        </div>
      </div>
    </div>

    {/* Carousel horizontal */}
    <div className="flex gap-5 overflow-x-auto px-1 py-2 pb-4 snap-x snap-mandatory scrollbar-none" id="reviewsTrack">
      {reviews.map((r, i) => (
        <div key={i} className="flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-stone-200 bg-cream-100 p-[22px]">
          <div className="flex items-center gap-[11px]">
            <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-[.9rem] font-bold text-white">
              {r.author[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[.9rem] font-bold text-stone-800">{r.author}</p>
              <div className="mt-0.5 flex gap-0.5">
                {[...Array(r.rating || 5)].map((_, j) => <Star key={j} className="size-[13px] fill-amber-400 text-amber-400" />)}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <span className="flex size-[15px] items-center justify-center rounded-full bg-[#4285F4] text-[9px] font-extrabold text-white">G</span>
              <span className="text-[.72rem] text-stone-400">Google</span>
            </div>
          </div>
          <p className="flex-1 text-[.89rem] leading-relaxed text-stone-600 before:mr-0.5 before:text-primary-300 before:font-serif before:text-[1.3rem] before:content-['\201C']">{r.text}</p>
          <p className="text-[.76rem] text-stone-400">{r.date}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

> **Note** : le carousel auto-scroll (toutes les 3.5s) est optionnel pour le MVP. L'implémenter en bonus si le temps le permet — sinon, juste le scroll horizontal natif.

---

## Étape 6 — RDV (widget de réservation natif)

**Fichier** : `apps/frontend/src/components/booking/PublicBookingWidget.tsx`

Remplacer le composant actuel par une UI native sans Schedule-X (la maquette ne l'utilise pas). Structure maquette (lignes 407-432) :

- En-tête avec mois + flèches navigation
- Grille 7 jours (L M M J V S D) avec slots de date
- Ligne de créneaux horaires (pills)
- Bouton confirmation en bas

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

// ... generateSlots, generateTimeSlots (même logique qu'avant)

export default function PublicBookingWidget() {
  const t = useTranslations('rdv')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState<'calendar' | 'form' | 'done'>('calendar')
  // ... other states

  // Générer les jours de la semaine du mois courant
  const days = generateWeekDays(currentMonth)

  return (
    <section id="rdv" className="scroll-mt-24 border-y border-stone-200 bg-white px-4 py-[88px] md:py-[60px]">
      <div className="container mx-auto max-w-[1200px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            Rendez-vous
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            {t('title')}
          </h2>
          <p className="mt-2.5 text-stone-600">{t('subtitle')}</p>
        </div>

        <div className="mx-auto max-w-[640px] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-md">
          {/* En-tête mois */}
          <div className="flex items-center justify-between border-b border-stone-200 px-[22px] py-[18px]">
            <button onClick={prevMonth} className="flex size-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500">
              <ChevronLeft className="size-3.5" />
            </button>
            <strong className="font-heading text-[.98rem] text-stone-800">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </strong>
            <button onClick={nextMonth} className="flex size-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500">
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-2 px-[22px] py-[18px]">
            {['L','M','M','J','V','S','D'].map((d, i) => (
              <div key={i} className="text-center text-[.7rem] font-bold uppercase text-stone-400">{d}</div>
            ))}
            {days.map((day, i) => (
              <button
                key={i}
                onClick={() => day.available && setSelectedDate(day.iso)}
                disabled={!day.available}
                className={`aspect-square rounded-[10px] flex items-center justify-center text-[.82rem] font-semibold transition-colors ${
                  day.iso === selectedDate ? 'bg-primary-600 text-white' :
                  day.available ? 'border border-primary-200 bg-primary-50 text-primary-700 cursor-pointer hover:bg-primary-100' :
                  'bg-cream-200 text-stone-400 cursor-default'
                }`}>
                {day.num}
              </button>
            ))}
          </div>

          {/* Créneaux horaires */}
          {selectedDate && (
            <div className="flex flex-wrap gap-2.5 px-[22px] py-1 pb-[22px]">
              {generateTimeSlots().map((time) => (
                <button
                  key={time}
                  onClick={() => { setSelectedTime(time); setStep('form') }}
                  className={`rounded-full border px-[14px] py-2 text-[.83rem] font-semibold transition-colors ${
                    time === selectedTime ? 'bg-primary-600 border-primary-600 text-white' :
                    'border-stone-200 bg-white text-stone-600 hover:border-primary-300'
                  }`}>
                  {time}
                </button>
              ))}
            </div>
          )}

          {/* Bouton confirmation */}
          {selectedDate && selectedTime && step === 'form' && (
            <div className="border-t border-stone-200 px-[22px] py-[18px]">
              <button onClick={handleSubmit} disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cta-700 py-3.5 text-[.95rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-800">
                Confirmer le {new Date(selectedDate).toLocaleDateString('fr-FR')} à {selectedTime}
                <ArrowRight className="size-[17px]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
```

---

## Étape 7 — Infos + Contact

**Fichier** : `apps/frontend/src/components/sections/InfosSection.tsx`

Refonte pour correspondre à la maquette (lignes 435-462). 4 cartes info en haut, map + formulaire contact en bas (2 colonnes).

La structure actuelle est déjà proche. Ajuster pour correspondre aux espacements et styles de la maquette.

---

## Étape 8 — Footer

**Fichier** : `apps/frontend/src/components/layout/Footer.tsx`

Refonte pour correspondre à la maquette (lignes 466-477). Barre de dégradé, trois zones (nom, nav, ville), lien espace praticien, copyright.

---

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `Header.tsx` | Refonte complète (floating nav + mobile panel) |
| `page.tsx` (homepage) | Refonte hero section |
| `PresentationSection.tsx` | Timeline + approche layout |
| `ServicesSection.tsx` | Grid 3-col avec fond blanc |
| `ReviewsSection.tsx` | Rating hero + carousel horizontal |
| `PublicBookingWidget.tsx` | Widget natif sans Schedule-X |
| `InfosSection.tsx` | Ajustements espacements/styles |
| `Footer.tsx` | Gradient + layout 3 zones |

## Fichiers inchangés

- `layout.tsx` — polices, metadata, structure HTML
- `messages/*.json` — clés i18n existantes conservées (ajouter les nouvelles si nécessaire)
- `globals.css` — tokens existants suffisent
- Tous les composants dashboard (espace praticien)

---

## Règles obligatoires

1. **Maquette = source unique de vérité** pour les couleurs, espacements, typographie.
2. **Tokens projet uniquement** : mapper les `--var` de la maquette vers nos tokens.
3. **i18n conservé** : utiliser les clés existantes. Ajouter uniquement si nouveau contenu.
4. **Icônes Lucide** : remplacer tous les SVG inline par des composants Lucide React.
5. **Pas de `any`** sans justification.
6. **Scroll reveal** : optionnel pour le MVP, peut être ajouté en bonus.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```
