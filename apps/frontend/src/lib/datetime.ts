const MOROCCO_TZ = 'Africa/Casablanca'

export function formatDateMorocco(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: MOROCCO_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

export function formatTimeMorocco(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: MOROCCO_TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatDateTimeMorocco(iso: string): string {
  return `${formatDateMorocco(iso)} ${formatTimeMorocco(iso)}`
}

// --------------------------------------------------------
// Saisie d'heure flexible (Phase B — B2, port TS de yuvomi i18n.js).
// Fast-path texte libre : un seul passage de regex (aucun split), les chiffres
// arabes (٠-٩) et persans (۰-۹) sont normalisés en ASCII avant l'analyse.
// --------------------------------------------------------

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => {
    const ar = ARABIC_DIGITS.indexOf(d)
    return String(ar !== -1 ? ar : PERSIAN_DIGITS.indexOf(d))
  })
}

export function toTimeParts(value: string): { hour: number; minute: number } | null {
  if (value == null) return null
  const raw = normalizeDigits(String(value).trim())
  if (!raw) return null

  // Heure seule (0-23) — « 9 »
  if (/^\d{1,2}$/.test(raw)) {
    const hour = Number(raw)
    return hour >= 0 && hour <= 23 ? { hour, minute: 0 } : null
  }

  // Séparateurs : : . , h H — « 09.30 », « 9,30 », « 9h30 »
  const sep = raw.match(/^(\d{1,2})[:.,hH](\d{2})$/)
  if (sep) {
    const hour = Number(sep[1])
    const minute = Number(sep[2])
    return hour >= 0 && hour < 24 && minute >= 0 && minute < 60 ? { hour, minute } : null
  }

  // Compact HMM / HHMM — « 930 » → 09:30, « 0930 » → 09:30
  if (/^\d{3,4}$/.test(raw)) {
    const hour = Number(raw.slice(0, -2))
    const minute = Number(raw.slice(-2))
    return hour >= 0 && hour < 24 && minute >= 0 && minute < 60 ? { hour, minute } : null
  }

  // 12h — « 9 am », « 09:45 pm »
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i)
  if (ampm) {
    let hour = Number(ampm[1])
    const minute = Number(ampm[2] ?? 0)
    const meridiem = ampm[3].toLowerCase()
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute >= 60) return null
    if (hour < 1 || hour > 12) return null
    if (meridiem === 'pm' && hour !== 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    return { hour, minute }
  }

  return null
}

/** Normalise une saisie libre en HH:MM ; '' si invalide. */
export function parseTimeInput(value: string): string {
  const parts = toTimeParts(value)
  if (!parts) return ''
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

/** Normalisation au blur (format d'affichage ; 24h ici). */
export function formatTimeInput(value: string): string {
  return parseTimeInput(value)
}

/** Vide = valide (champ optionnel) ; sinon doit être une heure parseable. */
export function isTimeInputValid(value: string): boolean {
  return !String(value ?? '').trim() || toTimeParts(value) !== null
}
