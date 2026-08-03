/**
 * Module: Récurrences (Phase B — B3)
 * Port TS sans dépendance de `server/services/recurrence.js` (yuvomi).
 *
 * Sous-ensemble RRULE supporté :
 *   FREQ (DAILY/WEEKLY/MONTHLY/YEARLY) + INTERVAL + BYDAY,
 *   fin mutuellement exclusive UNTIL **ou** COUNT (RFC 5545).
 *
 * Cas limites pris en charge (testés dans recurrence.test.ts) :
 *   - MONTHLY : clamp du jour au dernier jour (31 mars + 1 mois → 30 avril)
 *   - YEARLY  : 29 février → 28 février les années non bissextiles
 *   - FREQ=DAILY;BYDAY=X compte des JOURS (pas des semaines) — « chaque jour ouvré »
 *   - COUNT est compté depuis DTSTART et INCLUT les dates exclues (la limite
 *     s'applique avant l'EXDATE) — COUNT=10 avec 1 exclusion = 9 occurrences vues
 *   - nextOccurrenceAfter : boucle bornée (1000) pour rattraper les séries
 *
 * Note : les occurrences sont calculées en UTC sur des clés YYYY-MM-DD
 * (pas de slicing toISOString sur des dates locales).
 */

const DAY_MAP: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 }

export type ParsedRRule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  byday: number[]
  until: Date | null
  count: number | null
}

/** Parse une règle iCal ; null si FREQ inconnue ou absente. */
export function parseRRule(rule: string): ParsedRRule | null {
  if (!rule) return null
  const raw = rule.startsWith('RRULE:') ? rule.slice(6) : rule
  const parts: Record<string, string> = {}
  for (const segment of raw.split(';')) {
    const eq = segment.indexOf('=')
    if (eq === -1) continue
    parts[segment.slice(0, eq).toUpperCase()] = segment.slice(eq + 1)
  }

  const freq = parts.FREQ ?? null
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null

  const interval = parseInt(parts.INTERVAL ?? '1', 10) || 1
  const byday = (parts.BYDAY ?? '')
    .split(',')
    .map((d) => DAY_MAP[d.trim().toUpperCase()])
    .filter((d) => d !== undefined)
  const until = parts.UNTIL ? parseUntilDate(parts.UNTIL) : null
  const countRaw = parts.COUNT ? parseInt(parts.COUNT, 10) : null
  const count = Number.isInteger(countRaw) && (countRaw ?? 0) > 0 ? countRaw : null

  return { freq: freq as ParsedRRule['freq'], interval, byday, until, count }
}

/** Accepte YYYYMMDD ou YYYYMMDDTHHmmssZ. */
function parseUntilDate(str: string): Date {
  const clean = str.replace(/[TZ]/g, '')
  const y = parseInt(clean.slice(0, 4), 10)
  const m = parseInt(clean.slice(4, 6), 10) - 1
  const d = parseInt(clean.slice(6, 8), 10)
  return new Date(Date.UTC(y, m, d))
}

/** Occurrence suivante après baseDateStr ; null en fin de série (UNTIL). */
export function nextOccurrence(baseDateStr: string, rrule: string): string | null {
  const parsed = parseRRule(rrule)
  if (!parsed || !baseDateStr) return null

  const base = new Date(baseDateStr + 'T00:00:00Z')
  if (Number.isNaN(base.getTime())) return null

  const { freq, interval, byday, until } = parsed
  const next = new Date(base)

  if (freq === 'DAILY' && byday.length === 0) {
    next.setUTCDate(next.getUTCDate() + interval)
  } else if (freq === 'WEEKLY' || (freq === 'DAILY' && byday.length > 0)) {
    if (byday.length === 0) {
      // Pas de BYDAY → même jour, intervalle de semaines
      next.setUTCDate(next.getUTCDate() + 7 * interval)
    } else {
      // FREQ=DAILY;BYDAY compte des JOURS : prochain jour correspondant sans
      // saut de semaine ; FREQ=WEEKLY;BYDAY saute intervalle-1 semaines quand
      // la limite de semaine est franchie.
      const weekInterval = freq === 'WEEKLY' ? interval : 1
      const currentDay = base.getUTCDay()
      const sorted = [...byday].sort((a, b) => {
        const da = (a - currentDay + 7) % 7 || 7
        const db = (b - currentDay + 7) % 7 || 7
        return da - db
      })
      let daysUntil = (sorted[0] - currentDay + 7) % 7
      if (daysUntil === 0) {
        daysUntil = 7 * weekInterval
      } else if ((sorted[0] + 6) % 7 < (currentDay + 6) % 7) {
        daysUntil += 7 * (weekInterval - 1)
      }
      next.setUTCDate(next.getUTCDate() + daysUntil)
    }
  } else if (freq === 'MONTHLY') {
    const targetDay = base.getUTCDate()
    // Passer par le jour 1 : setUTCMonth(+1) sur un 31 roulerait sur le mois
    // suivant (31 avril → 1er mai) AVANT le clamp — bug latent de l'original
    // yuvomi, attrapé par le test « 31 mars + 1 mois → 30 avril ».
    next.setUTCDate(1)
    next.setUTCMonth(next.getUTCMonth() + interval)
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
    next.setUTCDate(Math.min(targetDay, lastDay))
  } else if (freq === 'YEARLY') {
    const targetMonth = base.getUTCMonth()
    const targetDay = base.getUTCDate()
    next.setUTCDate(1)
    next.setUTCFullYear(next.getUTCFullYear() + interval)
    next.setUTCMonth(targetMonth)
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate()
    next.setUTCDate(Math.min(targetDay, lastDay))
  }

  if (until && next > until) return null
  return next.toISOString().slice(0, 10)
}

/**
 * Première occurrence >= notBeforeStr (rattrapage des séries en retard).
 * Boucle bornée à 1000 itérations ; null si la série se termine avant.
 */
export function nextOccurrenceAfter(baseDateStr: string, rrule: string, notBeforeStr: string): string | null {
  let current = nextOccurrence(baseDateStr, rrule)
  let guard = 0
  while (current && notBeforeStr && current < notBeforeStr && guard++ < 1000) {
    current = nextOccurrence(current, rrule)
  }
  return current
}

/** Le jour de la semaine de dateStr est-il dans le BYDAY de la règle ? */
export function matchesRRuleByday(dateStr: string, rrule: string): boolean {
  const parsed = parseRRule(rrule)
  if (!parsed || parsed.byday.length === 0) return true
  const day = new Date(dateStr + 'T00:00:00Z')
  if (Number.isNaN(day.getTime())) return true
  return parsed.byday.includes(day.getUTCDay())
}

export type RecurringSeries = {
  /** Ancre de la série (DTSTART), YYYY-MM-DD. */
  start: string
  rule: string
  /** Fin de série inclusive (équivalent UNTIL), YYYY-MM-DD. */
  endDate?: string | null
  /** Dates exclues (EXDATE), YYYY-MM-DD. */
  exceptions?: string[]
}

/**
 * Occurrences d'une série dans [from, to] (bornes incluses), en YYYY-MM-DD.
 * Les dates exclues sont sautées ; COUNT est compté sur les occurrences
 * GÉNÉRÉES (y compris les exclues, RFC 5545). Boucles bornées (1000).
 * Note : COUNT est exact quand from <= start (les occurrences antérieures à
 * la fenêtre ne sont pas comptées) — l'UI d'agenda produit des séries
 * hebdomadaires finies par UNTIL/recurrenceEnd, pas par COUNT.
 */
export function expandSeries(series: RecurringSeries, from: string, to: string): string[] {
  const parsed = parseRRule(series.rule)
  if (!parsed) return []

  const exceptions = new Set(series.exceptions ?? [])
  const endBound = series.endDate ? series.endDate.slice(0, 10) : null
  const out: string[] = []

  let cur: string | null = series.start
  let guard = 0

  // Rattrapage jusqu'à la fenêtre
  while (cur && cur < from && guard++ < 1000) {
    cur = nextOccurrence(cur, series.rule)
  }

  let generated = 0
  while (cur && cur <= to && guard++ < 1000 && out.length < 1000) {
    if (endBound && cur > endBound) break
    generated++
    if (parsed.count !== null && generated > parsed.count) break
    if (!exceptions.has(cur)) out.push(cur)
    cur = nextOccurrence(cur, series.rule)
  }

  return out
}
