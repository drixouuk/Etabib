'use client'

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import PatientDeleteButton from './PatientDeleteButton'

type Props = {
  patientId: string
  patientName: string
}

export default function PatientActionsDropdown({ patientId, patientName }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex size-7 items-center justify-center rounded-lg text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-600"
        aria-label="Actions"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute start-0 top-full z-20 mt-1 w-40 rounded-lg border border-warm bg-white py-1 shadow-lg">
          <Link
            href={`/dashboard/patients/${patientId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-800 transition-colors duration-200 hover:bg-stone-50"
          >
            <Pencil className="size-3.5" />
            Éditer
          </Link>
          <div onClick={() => setOpen(false)}>
            <PatientDeleteButton patientId={patientId} patientName={patientName} />
          </div>
        </div>
      )}
    </div>
  )
}
