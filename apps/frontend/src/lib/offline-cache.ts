// SX-100 — Cache de lecture minimal (RDV du jour + dossiers patients).
//
// Lecture seule, write-through : à chaque fetch réussi, la réponse est
// écrite silencieusement dans IndexedDB avec un horodatage. Si une requête
// échoue pour cause réseau, la version en cache est servie.
//
// GARDE-FOU CLINIQUE : toute donnée servie depuis le cache doit être
// présentée avec un indicateur visible et horodaté ("Données mises en cache
// à HH:MM — hors ligne") — jamais comme équivalente à une donnée live.
//
// Versioning : chaque entrée porte cacheVersion ('v1'). Au chargement, si la
// version diffère de la constante, l'entrée est ignorée (traitée absente) —
// bump de la constante suffit quand le schéma du dossier évolue.
// TTL simple : 24h, pas de purge complexe.

const DB_NAME = 'etabib-offline'
const DB_VERSION = 1
const STORE = 'readCache'

export const CACHE_VERSION = 'v1'
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type CacheEntry = {
  key: string
  cacheVersion: string
  data: unknown
  cachedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(fn: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode = 'readwrite'): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Write-through silencieux : échec d'écriture ignoré (le live prime). */
export async function cacheSet(key: string, data: unknown): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const entry: CacheEntry = { key, cacheVersion: CACHE_VERSION, data, cachedAt: Date.now() }
  await withStore((s) => s.put(entry)).catch(() => {})
}

/**
 * Retourne l'entrée si elle est de la bonne version et dans le TTL, sinon
 * null (version obsolète → traitée comme absente, jamais servie partielle).
 */
export async function cacheGet(key: string): Promise<CacheEntry | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const entry = await withStore<CacheEntry | undefined>((s) => s.get(key), 'readonly')
    if (!entry) return null
    if (entry.cacheVersion !== CACHE_VERSION) return null
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

export type ReadResult<T> =
  | { data: T; fromCache: false }
  | { data: T; fromCache: true; cachedAt: number }

/**
 * Enveloppe une lecture réseau : succès → write-through + retour live ;
 * échec réseau → version en cache si disponible, sinon l'erreur remonte.
 * L'APPELANT est responsable d'afficher l'indicateur "données en cache"
 * quand fromCache est true (garde-fou clinique).
 */
export async function withReadCache<T>(key: string, fetcher: () => Promise<T>): Promise<ReadResult<T>> {
  try {
    const data = await fetcher()
    void cacheSet(key, data)
    return { data, fromCache: false }
  } catch (err) {
    const cached = await cacheGet(key)
    if (cached) {
      return { data: cached.data as T, fromCache: true, cachedAt: cached.cachedAt }
    }
    throw err
  }
}
