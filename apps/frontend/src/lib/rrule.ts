/**
 * Matcher de récurrence pour la surface de réservation (Phase B — B3).
 *
 * L'engine complet (parse/expansion bornée, tests unitaires) vit côté CMS :
 * `apps/cms/src/lib/recurrence.ts`. L'UI de réglage produit des règles
 * FREQ=WEEKLY;BYDAY=...;INTERVAL=1 — ce module couvre ce sous-ensemble côté
 * frontend (route week-availability + réglages), sans dépendance.
 */

const WEEKDAY_LETTERS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** Clé locale YYYY-MM-DD (pas de slicing toISOString : décalage UTC). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Le jour local de `date` est-il dans le BYDAY de la règle ? (sans BYDAY → tous les jours) */
export function ruleMatchesDate(rule: string, date: Date): boolean {
  const m = rule.match(/BYDAY=([A-Z,]+)/)
  if (!m) return true
  return new Set(m[1].split(',')).has(WEEKDAY_LETTERS[date.getDay()])
}

export type OccursOnSlot = {
  dayOfWeek: string
  recurrenceRule?: string | null
  recurrenceEnd?: string | null
  exceptions?: Array<{ date?: string | null } | string> | null
}

/**
 * Un créneau produit-il une occurrence à cette date ?
 * - avec règle : correspondance BYDAY + fin de série + exceptions (EXDATE)
 * - sans règle : comportement historique (jour de la semaine fixe)
 */
export function slotOccursOn(slot: OccursOnSlot, date: Date): boolean {
  if (slot.recurrenceRule) {
    const key = toDateKey(date)
    if (slot.recurrenceEnd && key > String(slot.recurrenceEnd).slice(0, 10)) return false
    const exceptions = slot.exceptions ?? []
    const excepted = exceptions.some((e) =>
      typeof e === 'string' ? e.slice(0, 10) === key : String(e?.date ?? '').slice(0, 10) === key,
    )
    if (excepted) return false
    return ruleMatchesDate(slot.recurrenceRule, date)
  }
  return Number(slot.dayOfWeek) === date.getDay()
}

/** Prochaine occurrence à partir de `from` (fenêtre bornée de 28 jours), YYYY-MM-DD. */
export function nextOccurrenceDate(slot: OccursOnSlot, from: Date): string {
  for (let i = 0; i < 28; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    if (slotOccursOn(slot, d)) return toDateKey(d)
  }
  return ''
}

// --------------------------------------------------------
// describeRRule — la règle en langage clair (vue lecture, B1)
// --------------------------------------------------------

const DAY_LABELS_FR: Record<string, string> = {
  MO: 'lundi', TU: 'mardi', WE: 'mercredi', TH: 'jeudi', FR: 'vendredi', SA: 'samedi', SU: 'dimanche',
}

/** « Toutes les semaines (lundi, mercredi) · jusqu'au 31/12/2026 » — '' si non parseable. */
export function describeRRule(rule: string | null | undefined): string {
  if (!rule) return ''
  const freq = rule.match(/FREQ=(\w+)/)?.[1]
  if (!freq) return ''

  const interval = Number(rule.match(/INTERVAL=(\d+)/)?.[1] ?? '1') || 1
  const byday = rule.match(/BYDAY=([A-Z,]+)/)?.[1]?.split(',') ?? []
  const until = rule.match(/UNTIL=(\d{8})/)?.[1]
  const count = Number(rule.match(/COUNT=(\d+)/)?.[1] ?? '0')

  let base: string
  if (freq === 'DAILY') base = interval > 1 ? `Tous les ${interval} jours` : 'Tous les jours'
  else if (freq === 'WEEKLY') base = interval > 1 ? `Toutes les ${interval} semaines` : 'Toutes les semaines'
  else if (freq === 'MONTHLY') base = interval > 1 ? `Tous les ${interval} mois` : 'Tous les mois'
  else base = interval > 1 ? `Tous les ${interval} ans` : 'Tous les ans'

  if (byday.length > 0) base += ` (${byday.map((d) => DAY_LABELS_FR[d] ?? d).join(', ')})`
  if (until) base += ` · jusqu'au ${until.slice(6, 8)}/${until.slice(4, 6)}/${until.slice(0, 4)}`
  else if (count > 0) base += ` · ${count} fois`
  return base
}
