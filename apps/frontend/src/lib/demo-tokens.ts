/**
 * Stockage en mémoire des tokens de demande de démo.
 * Volume très faible (~10 demandes/mois), perte d'état au redémarrage acceptable
 * (le demandeur refait une demande).
 * Si le volume augmente significativement, migrer vers Redis ou une collection Payload dédiée.
 */
const demoStore = new Map<string, { email: string; name: string; expiresAt: number }>()

function cleanExpired() {
  const now = Date.now()
  for (const [key, entry] of demoStore) {
    if (entry.expiresAt < now) demoStore.delete(key)
  }
}

export function storeDemoToken(token: string, email: string, name: string): void {
  cleanExpired()
  demoStore.set(token, { email, name, expiresAt: Date.now() + 48 * 60 * 60 * 1000 })
}

export function verifyDemoToken(token: string, email: string): { valid: boolean; name: string } {
  cleanExpired()
  const entry = demoStore.get(token)
  if (!entry) return { valid: false, name: '' }
  if (entry.expiresAt < Date.now()) {
    demoStore.delete(token)
    return { valid: false, name: '' }
  }
  if (entry.email !== email) return { valid: false, name: '' }
  return { valid: true, name: entry.name }
}

export function consumeDemoToken(token: string): void {
  demoStore.delete(token)
}
