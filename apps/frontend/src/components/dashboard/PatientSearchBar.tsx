'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { Search, Loader2 } from 'lucide-react'

type Suggestion = {
  id: string
  fullName: string
  nationalId?: string | null
}

export default function PatientSearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/cms-proxy/patients/search?q=${encodeURIComponent(query.trim())}`,
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.docs ?? [])
          setOpen(true)
        }
      } catch {
        // silent
      }
      setLoading(false)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setOpen(false)
    if (query.trim()) {
      router.push(`/dashboard/patients?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-white py-[11px] px-[14px] transition-all duration-200 hover:border-primary-500 hover:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]">
          <Search className="size-4 shrink-0 text-stone-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un patient…"
            className="flex-1 border-none bg-transparent text-sm text-stone-800 placeholder:text-stone-600"
          />
          {loading && <Loader2 className="size-4 animate-spin text-stone-600" />}
          {!loading && <kbd className="ml-auto rounded-md bg-stone-100 px-2 py-0.5 text-[10.5px] text-stone-600">⌘K</kbd>}
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-warm bg-white py-1 shadow-lg">
          {suggestions.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/patients/${p.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-sm text-stone-800 transition-colors duration-200 hover:bg-stone-50"
            >
              <span className="font-medium">{p.fullName}</span>
              {p.nationalId && <span className="text-xs text-stone-600">{p.nationalId}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
