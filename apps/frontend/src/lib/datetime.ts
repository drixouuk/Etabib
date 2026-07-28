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
