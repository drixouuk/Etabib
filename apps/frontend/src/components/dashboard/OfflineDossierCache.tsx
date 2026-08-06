'use client'

// SX-100 — cache de lecture du dossier patient.
// Miroir write-through : au montage, les données clés du dossier (patient +
// vaccins + historique poids/taille) sont chargées via cms-proxy et écrites
// silencieusement dans le cache IndexedDB. Si le réseau coupe en cours de
// session, le panneau affiche la version en cache AVEC son horodatage —
// jamais présentée comme équivalente à une donnée live (garde-fou clinique).

import { useEffect, useState } from 'react'
import { cacheSet, cacheGet } from '@/lib/offline-cache'

type CachedConsultation = {
  id: string
  date?: string | null
  motif?: string | null
  poids?: number | null
  taille?: number | null
}

type CachedVaccination = {
  id: string
  vaccine?: string | { name?: string } | null
  date?: string | null
}

type CachedDossier = {
  patient?: { id: string; fullName?: string | null; allergies?: unknown } | null
  vaccinations?: CachedVaccination[]
  consultations?: CachedConsultation[]
  cachedAt: number
}

type Props = {
  patientId: string
}

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function OfflineDossierCache({ patientId }: Props) {
  const [cached, setCached] = useState<CachedDossier | null>(null)

  useEffect(() => {
    let cancelled = false
    const key = `dossier:patient:${patientId}`

    const mirror = async () => {
      const results = await Promise.all([
        fetch(`/api/cms-proxy/patients/${patientId}?depth=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/cms-proxy/vaccinations?where[patient][equals]=${patientId}&depth=0&limit=100`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/cms-proxy/consultations?where[patient][equals]=${patientId}&sort=-date&depth=0&limit=10`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ])
      const [patient, vacc, cons] = results
      if (patient || vacc?.docs?.length || cons?.docs?.length) {
        const bundle: CachedDossier = {
          patient: patient ?? null,
          vaccinations: vacc?.docs ?? [],
          consultations: cons?.docs ?? [],
          cachedAt: Date.now(),
        }
        void cacheSet(key, bundle)
      }
    }

    const tryOffline = async () => {
      const entry = await cacheGet(key)
      if (!cancelled && entry) setCached(entry.data as CachedDossier)
    }

    void mirror()
    window.addEventListener('offline', () => void tryOffline())
    return () => {
      cancelled = true
      window.removeEventListener('offline', () => void tryOffline())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  if (!cached) return null

  const allergies = cached.patient?.allergies

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-stone-800">
        <span className="size-2 shrink-0 rounded-full bg-amber-500" />
        Données mises en cache à {fmtTime(cached.cachedAt)} — hors ligne
      </p>
      <p className="text-[13px] text-stone-600">
        Ces données peuvent être incomplètes (un allergène ou une note ajouté(e) juste avant la coupure peut manquer).
      </p>
      <div className="grid gap-3 text-[13px] text-stone-700 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-stone-800">Allergies</p>
          <p className="mt-0.5">{allergies ? String(allergies) : 'Aucune allergie connue'}</p>
        </div>
        <div>
          <p className="font-semibold text-stone-800">Vaccins (en cache)</p>
          <ul className="mt-0.5 list-disc ps-4">
            {(cached.vaccinations ?? []).slice(0, 5).map((v) => (
              <li key={v.id}>
                {typeof v.vaccine === 'object' && v.vaccine ? v.vaccine.name ?? 'Vaccin' : (v.vaccine ?? 'Vaccin')} — {fmtDate(v.date)}
              </li>
            ))}
            {(cached.vaccinations ?? []).length === 0 && <li>Aucun vaccin enregistré</li>}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-stone-800">Dernières mesures</p>
          <ul className="mt-0.5 list-disc ps-4">
            {(cached.consultations ?? []).slice(0, 3).map((c) => (
              <li key={c.id}>
                {fmtDate(c.date)} — {c.poids != null ? `${c.poids} kg` : 'poids —'} {c.taille != null ? `· ${c.taille} cm` : ''}
              </li>
            ))}
            {(cached.consultations ?? []).length === 0 && <li>Aucune consultation en cache</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
