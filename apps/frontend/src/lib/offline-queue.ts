// SX-100 — File d'attente d'écriture persistante des consultations.
//
// Hypothèse produit : un seul rédacteur actif par dossier (pas de sync ni de
// merge — aucune logique de conflit ici).
//
// Règles :
// - IndexedDB (pas localStorage : taille et structure).
// - Vidage EN SÉRIE dans l'ordre createdAt croissant (ordre d'écriture
//   déterministe si plusieurs consultations du même patient en file).
// - Backoff exponentiel 1s → 5s → 30s → 2min ; après 5 échecs OU 24h en
//   file → status 'failed' (gestion manuelle dans l'UI), plus de retry auto.
// - 401 (token expiré pendant la coupure) → status 'auth_expired', l'entrée
//   reste en file ; le vidage repart après une RECONNEXION utilisateur
//   (événement etabib:sync-requested) — JAMAIS de refresh de token ici
//   (un seul chemin de refresh : le flux de login normal).
// - Les échecs réseau (fetch rejeté) laissent l'entrée pending et posent
//   nextRetryAt ; le ping de santé évite de se fier au seul événement online.
//
// Branchement au service worker existant (/sw.js) : aucun — le SW ne traite
// ni /api/ ni /dashboard/ ; ce module communique avec l'UI par CustomEvent.

const DB_NAME = 'etabib-offline'
const DB_VERSION = 1
const STORE = 'pendingConsultations'

export type QueueStatus = 'pending' | 'auth_expired' | 'failed'

export type QueueEntry = {
  clientRequestId: string
  payload: Record<string, unknown>
  patientId?: string
  createdAt: number
  retryCount: number
  nextRetryAt?: number
  status: QueueStatus
}

// Exposé pour les tests / débogage
export const BACKOFF_MS = [1_000, 5_000, 30_000, 120_000]
export const MAX_RETRIES = 5
export const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000

export const QUEUE_EVENT = 'etabib:queue-updated'
export const SYNC_EVENT = 'etabib:sync-requested'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'clientRequestId' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = fn(tx.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function notify() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(QUEUE_EVENT))
}

export function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Ajoute (ou met à jour) une consultation en file. Retourne le clientRequestId. */
export async function enqueueConsultation(opts: {
  payload: Record<string, unknown>
  patientId?: string
  clientRequestId?: string
  status?: QueueStatus
}): Promise<string> {
  const clientRequestId = opts.clientRequestId ?? newClientRequestId()
  const entry: QueueEntry = {
    clientRequestId,
    payload: opts.payload,
    patientId: opts.patientId,
    createdAt: Date.now(),
    retryCount: 0,
    status: opts.status ?? 'pending',
  }
  await withStore((s) => s.put(entry))
  notify()
  return clientRequestId
}

export async function listQueue(): Promise<QueueEntry[]> {
  const db = await openDb()
  return new Promise<QueueEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const entries = (req.result as QueueEntry[]).sort((a, b) => a.createdAt - b.createdAt)
      resolve(entries)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function removeEntry(clientRequestId: string): Promise<void> {
  await withStore((s) => s.delete(clientRequestId))
  notify()
}

async function updateEntry(entry: QueueEntry): Promise<void> {
  await withStore((s) => s.put(entry))
}

/** Ping de santé léger : tout statut HTTP prouve que le réseau répond. */
async function pingHealth(): Promise<boolean> {
  try {
    await fetch('/api/queue-stats', { method: 'GET' })
    return true
  } catch {
    return false
  }
}

export type FlushResult = {
  synced: number
  authExpired: number
  failed: number
}

/**
 * Vide la file EN SÉRIE (ordre createdAt). Chaque entrée attend sa
 * résolution avant la suivante. Retourne un résumé pour l'UI.
 */
export async function flushQueue(): Promise<FlushResult> {
  const result: FlushResult = { synced: 0, authExpired: 0, failed: 0 }
  if (typeof indexedDB === 'undefined') return result

  const entries = await listQueue()
  const pending = entries.filter((e) => e.status === 'pending' && (e.nextRetryAt ?? 0) <= Date.now())
  if (pending.length === 0) return result

  if (!(await pingHealth())) return result

  for (const entry of pending) {
    const res = await fetch('/api/cms-proxy/consultations/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry.payload, clientRequestId: entry.clientRequestId }),
    }).catch(() => null)

    if (res === null) {
      // Réseau coupé en plein vidage : backoff et on s'arrête (le ping
      // suivant décidera). L'entrée reste pending.
      entry.retryCount += 1
      entry.nextRetryAt = Date.now() + backoffDelay(entry.retryCount)
      await updateEntry(entry)
      break
    }

    if (res.status === 401) {
      // Token expiré pendant la coupure : l'entrée reste, plus de retry auto.
      entry.status = 'auth_expired'
      entry.retryCount += 1
      await updateEntry(entry)
      result.authExpired += 1
      continue
    }

    if (res.ok || res.status === 200 || res.status === 201) {
      await removeEntry(entry.clientRequestId)
      result.synced += 1
      continue
    }

    // Erreur métier/serveur retryable (5xx) : backoff exponentiel, puis failed.
    entry.retryCount += 1
    if (entry.retryCount >= MAX_RETRIES || Date.now() - entry.createdAt >= MAX_QUEUE_AGE_MS) {
      entry.status = 'failed'
      await updateEntry(entry)
      result.failed += 1
    } else {
      entry.nextRetryAt = Date.now() + backoffDelay(entry.retryCount)
      await updateEntry(entry)
    }
  }

  notify()
  return result
}

function backoffDelay(retryCount: number): number {
  const idx = Math.min(Math.max(retryCount - 1, 0), BACKOFF_MS.length - 1)
  return BACKOFF_MS[idx]
}

/** Marque une entrée auth_expired (utilisé par le formulaire sur 401 direct). */
export async function markAuthExpired(clientRequestId: string): Promise<void> {
  const entries = await listQueue()
  const entry = entries.find((e) => e.clientRequestId === clientRequestId)
  if (entry) {
    entry.status = 'auth_expired'
    await updateEntry(entry)
    notify()
  }
}

/** Abonnement aux changements de file (état UI). Retourne le désabonnement. */
export function subscribeQueue(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(QUEUE_EVENT, cb)
  return () => window.removeEventListener(QUEUE_EVENT, cb)
}

/**
 * Déclencheurs de vidage : événement online (assisté du ping), retour de
 * visibilité (onglet réactivé), et demande explicite (etabib:sync-requested,
 * émis par le flux de reconnexion/login utilisateur). Idempotent : un vidage
 * en cours est ignoré.
 */
let flushing = false
export async function initQueueSync(): Promise<void> {
  if (typeof window === 'undefined') return
  const trigger = async () => {
    if (flushing) return
    flushing = true
    try {
      await flushQueue()
    } finally {
      flushing = false
    }
  }
  window.addEventListener('online', trigger)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void trigger()
  })
  window.addEventListener(SYNC_EVENT, trigger)

  // Vidage initial au montage : couvre la reconnexion après login — le
  // dashboard se remonte et la file se vide sans action de l'utilisateur.
  void trigger()
}
