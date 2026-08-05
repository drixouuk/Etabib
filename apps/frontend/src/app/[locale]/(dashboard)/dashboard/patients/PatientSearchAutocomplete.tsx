'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Search, Loader2 } from 'lucide-react'
import PatientAvatar from '@/components/dashboard/PatientAvatar'
import { computeAge } from '@/lib/age'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
}

export default function PatientSearchAutocomplete({ initialQ = '' }: { initialQ?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQ)
  const [suggestions, setSuggestions] = useState<Patient[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const fetchSuggestions = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/cms-proxy/patients/search?q=${encodeURIComponent(q)}`,
      )
      const data = await res.json()
      setSuggestions(data.docs ?? [])
      setOpen(true)
    } catch {
      setSuggestions([])
      setOpen(false)
    }
    setLoading(false)
  }

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const v = value.trim()
    if (v.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250)
  }

  const handleFocus = () => {
    const v = query.trim()
    if (v.length >= 2) fetchSuggestions(v)
  }

  const closeSoon = () => { setTimeout(() => setOpen(false), 200) }

  const showNoResults = open && !loading && suggestions.length === 0 && query.trim().length >= 2

  return (
    <div className="relative min-w-0 flex-1">
      <form
        method="GET"
        action="/dashboard/patients"
        onSubmit={() => setOpen(false)}
        className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/15 bg-card py-2.5 px-[14px] transition-all duration-200 hover:border-primary hover:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
      >
        {loading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <input
          type="text"
          name="q"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={closeSoon}
          placeholder="Rechercher par nom ou CIN…"
          autoComplete="off"
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); router.push('/dashboard/patients') }}
            className="shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Effacer
          </button>
        )}
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute start-0 end-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="max-h-[320px] overflow-y-auto py-1">
            {suggestions.map(p => (
              <Link
                key={p.id}
                href={`/dashboard/patients/${p.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-primary/10"
              >
                <PatientAvatar fullName={p.fullName} gender={p.gender as 'boy' | 'girl' | null} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.birthDate ? computeAge(p.birthDate) : ''}
                    {p.birthDate && p.nationalId ? ' · ' : ''}
                    {p.nationalId || ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="border-t border-border bg-muted/50 px-3 py-2">
            <Link
              href={`/dashboard/patients?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Voir tous les résultats →
            </Link>
          </div>
        </div>
      )}

      {showNoResults && (
        <div className="absolute start-0 end-0 top-full z-30 mt-1 rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground shadow-lg">
          Aucun patient trouvé.
        </div>
      )}
    </div>
  )
}
