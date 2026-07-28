'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'

type Row = {
  fullName: string
  gender: string
  birthDate: string
  nationalId: string
  line: number
}

type ParseResult = {
  valid: Row[]
  errors: { line: number; reason: string }[]
}

function parseCSV(text: string): ParseResult {
  const lines = text.split(/\r?\n/)
  const result: ParseResult = { valid: [], errors: [] }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (inQuotes) {
        if (ch === '"') {
          if (j + 1 < line.length && line[j + 1] === '"') {
            current += '"'
            j++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          fields.push(current)
          current = ''
        } else {
          current += ch
        }
      }
    }
    fields.push(current)

    const fullName = fields[0]?.trim()
    const gender = fields[1]?.trim().toLowerCase()
    const birthDate = fields[2]?.trim()
    const nationalId = fields[3]?.trim()

    if (!fullName) {
      result.errors.push({ line: i + 1, reason: 'Nom complet manquant' })
      continue
    }

    let mappedGender: string
    if (gender === 'boy' || gender === 'm' || gender === 'garçon' || gender === 'garcon') {
      mappedGender = 'boy'
    } else if (gender === 'girl' || gender === 'f' || gender === 'fille') {
      mappedGender = 'girl'
    } else {
      result.errors.push({ line: i + 1, reason: `Sexe invalide : "${gender}" (attendu boy/girl)` })
      continue
    }

    result.valid.push({
      fullName,
      gender: mappedGender,
      birthDate: birthDate || '',
      nationalId: nationalId || '',
      line: i + 1,
    })
  }

  return result
}

export default function ImportPatientsButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: { line: number; reason: string }[] } | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const p = parseCSV(text)
    setParsed(p)
    setDone(false)
    setResult(null)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!parsed) return
    setImporting(true)
    let imported = 0
    const errors: { line: number; reason: string }[] = [...parsed.errors]

    for (const row of parsed.valid) {
      const body: Record<string, string> = {
        fullName: row.fullName,
        gender: row.gender,
      }
      if (row.birthDate) body.birthDate = row.birthDate
      if (row.nationalId) body.nationalId = row.nationalId

      try {
        const res = await fetch('/api/cms-proxy/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          imported++
        } else {
          errors.push({ line: row.line, reason: 'Erreur API lors de la création' })
        }
      } catch {
        errors.push({ line: row.line, reason: 'Erreur réseau' })
      }
    }

    setResult({ imported, errors })
    setImporting(false)
    setDone(true)
    setParsed(null)
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      {!parsed && !done && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors duration-200 hover:bg-stone-50"
        >
          <Upload className="size-4" />
          Importer un CSV
        </button>
      )}

      {parsed && !importing && (
        <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm text-stone-800">
            <strong>{parsed.valid.length}</strong> patients valides détectés
            {parsed.errors.length > 0 && (
              <>, <strong>{parsed.errors.length}</strong> ligne(s) avec erreur(s)</>
            )}
          </p>
          {parsed.errors.length > 0 && (
            <ul className="mb-3 list-inside list-disc text-xs text-red-500">
              {parsed.errors.slice(0, 5).map((e, i) => (
                <li key={i}>Ligne {e.line} : {e.reason}</li>
              ))}
              {parsed.errors.length > 5 && <li>… et {parsed.errors.length - 5} autre(s)</li>}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700"
            >
              Importer {parsed.valid.length} patient{parsed.valid.length > 1 ? 's' : ''}
            </button>
            <button
              onClick={() => { setParsed(null); setResult(null) }}
              className="text-sm text-stone-800-soft hover:text-stone-800"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {importing && (
        <div className="rounded-xl border border-warm bg-stone-50 p-4">
          <p className="text-sm text-stone-600">Import en cours…</p>
        </div>
      )}

      {done && result && (
        <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-800">
            <strong className="text-green-600">{result.imported}</strong> patient{result.imported > 1 ? 's' : ''} importé{result.imported > 1 ? 's' : ''}
            {result.errors.length > 0 && (
              <>, <strong className="text-red-600">{result.errors.length}</strong> ligne{result.errors.length > 1 ? 's' : ''} en erreur</>
            )}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-red-500">
              {result.errors.map((e, i) => (
                <li key={i}>Ligne {e.line} : {e.reason}</li>
              ))}
            </ul>
          )}
          <button
            onClick={() => { setDone(false); setResult(null); setParsed(null) }}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
