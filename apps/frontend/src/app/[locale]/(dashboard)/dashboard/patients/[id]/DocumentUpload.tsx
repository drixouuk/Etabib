'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Document = {
  id: string
  documentType: string
  filename?: string
  url?: string
  createdAt: string
}

type Props = {
  patientId: string
  documents: Document[]
}

const typeLabels: Record<string, string> = {
  radio: 'Radio',
  analyse: 'Analyse',
  certificat: 'Certificat',
  'ordonnance-externe': 'Ordonnance externe',
  autre: 'Autre',
}

export default function DocumentUpload({ patientId, documents }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('radio')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setError('')
    setSaving(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('patient', patientId)
    fd.append('documentType', documentType)

    const res = await fetch('/api/cms-proxy/documents', {
      method: 'POST',
      body: fd,
    })

    if (res.ok) {
      setShowForm(false)
      setFile(null)
      setDocumentType('radio')
      router.refresh()
    } else {
      setError("Erreur lors de l'upload. Veuillez réessayer.")
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Documents</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800"
          >
            Ajouter un document
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Type de document *</label>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="radio">Radio</option>
              <option value="analyse">Analyse</option>
              <option value="certificat">Certificat</option>
              <option value="ordonnance-externe">Ordonnance externe</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Fichier *</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              required
              className="w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !file} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {saving ? 'Upload…' : 'Ajouter le document'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 hover:text-stone-700">Annuler</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {documents.length === 0 && !showForm ? (
        <div className="flex cursor-pointer flex-col items-center justify-center gap-2.5 border-2 border-dashed border-primary/15 px-4 py-11 text-sm text-stone-400 transition-colors duration-200 hover:border-primary-500 hover:bg-primary-50/30" onClick={() => setShowForm(true)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-stone-400"><path d="M12 16 V5"/><polyline points="7 9 12 4 17 9"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
          Glissez un document ici, ou cliquez pour en ajouter
        </div>
      ) : documents.length > 0 && (
        <div className="divide-y divide-stone-100">
          {documents.map(d => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium text-stone-800">{typeLabels[d.documentType] || d.documentType}</span>
                <p className="text-xs text-stone-400">
                  {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  {d.filename && ` — ${d.filename}`}
                </p>
              </div>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Voir
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
