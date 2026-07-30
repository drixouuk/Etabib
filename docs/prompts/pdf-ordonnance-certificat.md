# Issue : PDF ordonnance et certificat de consultation

## Contexte

- Les consultations et ordonnances existent dans le CMS mais ne sont pas exportables en PDF.
- Le médecin a besoin de pouvoir **télécharger/imprimer** une ordonnance ou un certificat de consultation pour le patient.
- Aucune librairie PDF n'est installée dans le projet.
- Stratégie retenue pour le MVP : client-side via `jsPDF` (pur JS, zéro dépendance native, fonctionne sur Vercel serverless).
- Deux types de documents : **ordonnance** (médicaments) et **certificat de consultation** (motif + diagnostic).

---

## Dépendance à installer

```bash
pnpm --filter frontend add jspdf
```

---

## Travail à faire

### 1. Utilitaire PDF partagé

**Fichier à créer** : `apps/frontend/src/lib/generate-pdf.ts`

Fonctions réutilisables pour générer les PDF côté client :

```typescript
import { jsPDF } from 'jspdf'

export type DoctorInfo = {
  name: string
  specialty: string
  rpps: string
  address: string
  phone: string
  city: string
}

export type PatientInfo = {
  name: string
  age: string
  nationalId?: string
  birthDate?: string
}

function addHeader(doc: jsPDF, doctor: DoctorInfo, patient: PatientInfo, title: string, date: string) {
  const pageW = 210 // A4 width in mm
  const margin = 20

  // Cadre extérieur
  doc.setDrawColor(13, 148, 136) // primary-600 (#0D9488)
  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageW - margin * 2, 40)

  // Nom du médecin + spécialité
  doc.setFontSize(16)
  doc.setTextColor(13, 148, 136) // primary-600
  doc.text(`Dr ${doctor.name}`, pageW / 2, margin + 12, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const subtitle = [doctor.specialty, doctor.rpps !== '—' ? `RPPS: ${doctor.rpps}` : '']
    .filter(Boolean).join(' — ')
  doc.text(subtitle, pageW / 2, margin + 20, { align: 'center' })

  // Adresse et contact
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  const contact = [doctor.address, doctor.city, doctor.phone].filter(Boolean).join(' · ')
  doc.text(contact, pageW / 2, margin + 26, { align: 'center' })

  // Titre du document
  doc.setFontSize(14)
  doc.setTextColor(13, 148, 136)
  doc.text(title, pageW / 2, margin + 34, { align: 'center' })

  // Date
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(date, pageW - margin, margin + 34, { align: 'right' })

  // Infos patient
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  const patientLine = [
    `Patient : ${patient.name}`,
    patient.age ? `Âge : ${patient.age}` : '',
    patient.nationalId ? `CIN : ${patient.nationalId}` : '',
  ].filter(Boolean).join('  |  ')
  doc.text(patientLine, margin, margin + 48)

  // Séparateur
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, margin + 52, pageW - margin, margin + 52)

  return margin + 56 // retourne la position Y après le header
}

function addFooter(doc: jsPDF, pageNumber: number) {
  const pageW = 210
  const margin = 20
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Page ${pageNumber}`, pageW / 2, 290, { align: 'center' })
  doc.text('Document généré par Dr Tabibi — Cabinet médical', pageW / 2, 294, { align: 'center' })
}

export function generatePrescriptionPDF(
  doctor: DoctorInfo,
  patient: PatientInfo,
  data: {
    date: string
    medications: { nom: string; dci: string; posologie: string; duree: string }[]
    notes?: string | null
  },
) {
  const doc = new jsPDF()
  const pageW = 210
  const margin = 20
  let y = addHeader(doc, doctor, patient, 'ORDONNANCE MÉDICALE', data.date)

  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)

  // Liste des médicaments
  data.medications.forEach((med, i) => {
    if (y > 260) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}. ${med.nom}`, margin, y)
    if (med.dci) {
      doc.setFont('helvetica', 'normal')
      doc.text(` (DCI: ${med.dci})`, margin + doc.getTextWidth(`${i + 1}. ${med.nom}`), y)
    }

    doc.setFont('helvetica', 'normal')
    y += 7
    doc.setFontSize(10)
    const dosages = [`Posologie : ${med.posologie}`, `Durée : ${med.duree}`].filter(Boolean)
    doc.text(dosages.join('  |  '), margin + 8, y)

    y += 10
    // Ligne légère entre médicaments
    if (i < data.medications.length - 1) {
      doc.setDrawColor(230, 230, 230)
      doc.line(margin + 8, y - 3, pageW - margin, y - 3)
    }
  })

  // Notes
  if (data.notes) {
    y += 6
    if (y > 270) { doc.addPage(); y = margin }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Notes :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.text(data.notes, margin + 5, y, { maxWidth: pageW - margin * 2 - 5 })
  }

  // Signature
  y += 20
  if (y > 270) { doc.addPage(); y = margin + 10 }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Signature du médecin :', pageW - margin - 40, y)
  doc.line(pageW - margin - 40, y + 12, pageW - margin, y + 12)

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`ordonnance-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

export function generateConsultationPDF(
  doctor: DoctorInfo,
  patient: PatientInfo,
  data: {
    date: string
    motif?: string | null
    diagnostic?: string | null
    poids?: number | null
    taille?: number | null
    perimetreCranien?: number | null
  },
) {
  const doc = new jsPDF()
  const margin = 20
  const pageW = 210
  let y = addHeader(doc, doctor, patient, 'CERTIFICAT DE CONSULTATION', data.date)

  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)

  // Motif
  if (data.motif) {
    doc.setFont('helvetica', 'bold')
    doc.text('Motif de consultation :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 7
    doc.text(data.motif, margin + 5, y, { maxWidth: pageW - margin * 2 - 5 })
    y += 10
  }

  // Mesures
  const mesures = [
    data.poids ? `Poids : ${data.poids} kg` : '',
    data.taille ? `Taille : ${data.taille} cm` : '',
    data.perimetreCranien ? `PC : ${data.perimetreCranien} cm` : '',
  ].filter(Boolean)
  if (mesures.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Mesures :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 7
    doc.text(mesures.join('  |  '), margin + 5, y)
    y += 10
  }

  // Diagnostic
  if (data.diagnostic) {
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnostic :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 7
    doc.text(data.diagnostic, margin + 5, y, { maxWidth: pageW - margin * 2 - 5 })
    y += 10
  }

  // Mention certificat
  y += 10
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(
    'Certificat remis au patient pour justificatif. Ne constitue pas un arrêt de travail.',
    margin, y, { maxWidth: pageW - margin * 2 },
  )

  // Signature
  y += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.text('Signature du médecin :', pageW - margin - 40, y)
  doc.line(pageW - margin - 40, y + 12, pageW - margin, y + 12)

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`consultation-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
```

### 2. Boutons PDF dans ConsultationForm

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx`

Le composant n'a actuellement pas accès aux infos du médecin ni aux infos complètes du patient. Il faut lui passer ces données via des props supplémentaires.

#### 2a. Props additionnelles

```tsx
import { generateConsultationPDF, type DoctorInfo, type PatientInfo } from '@/lib/generate-pdf'

type Props = {
  patientId: string
  consultations: Consultation[]
  isPediatrie?: boolean
  doctorInfo?: DoctorInfo   // ← à passer depuis la page serveur
  patientInfo?: PatientInfo // ← à passer depuis la page serveur
}
```

#### 2b. Bouton PDF

Pour chaque consultation affichée dans la liste historique (ligne ~132), ajouter un bouton "PDF" discret :

```tsx
{c.diagnostic && doctorInfo && patientInfo && (
  <button
    onClick={() =>
      generateConsultationPDF(doctorInfo, patientInfo, {
        date: new Date(c.date).toLocaleDateString('fr-FR'),
        motif: c.motif,
        diagnostic: c.diagnostic,
        poids: c.poids,
        taille: c.taille,
        perimetreCranien: c.perimetreCranien,
      })
    }
    className="ml-2 text-xs font-medium text-primary-600 hover:text-primary-700"
    title="Télécharger le certificat PDF"
  >
    PDF
  </button>
)}
```

Placer ce bouton à côté de la date de consultation, dans le `<div className="flex items-baseline justify-between">`.

### 3. Boutons PDF dans PrescriptionForm

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`

Même pattern.

#### 3a. Props additionnelles

```tsx
import { generatePrescriptionPDF, type DoctorInfo, type PatientInfo } from '@/lib/generate-pdf'

type Props = {
  patientId: string
  prescriptions: Prescription[]
  consultations: ConsultationOption[]
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
}
```

#### 3b. Bouton PDF

Pour chaque prescription dans l'historique (ligne ~174), ajouter le bouton :

```tsx
{p.medications?.length > 0 && doctorInfo && patientInfo && (
  <button
    onClick={() =>
      generatePrescriptionPDF(doctorInfo, patientInfo, {
        date: new Date(p.date).toLocaleDateString('fr-FR'),
        medications: p.medications,
        notes: p.notes,
      })
    }
    className="ml-2 text-xs font-medium text-primary-600 hover:text-primary-700"
    title="Télécharger l'ordonnance PDF"
  >
    PDF
  </button>
)}
```

### 4. Page patient — passer les infos docteur et patient

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

Le composant doit maintenant :
1. Récupérer la fiche `Doctor` (via `getDoctorProfile` ou un fetch dédié)
2. Récupérer `PracticeInfo` (adresse, phone, city — peut-être déjà en cache via `getPracticeInfo`)
3. Construire `DoctorInfo` et `PatientInfo` à partir des données disponibles
4. Passer ces props à `ConsultationForm` et `PrescriptionForm`

Modifications :

```tsx
// Ajouter l'import
import { getDoctorProfile, getPracticeInfo } from '@/lib/payload'
import type { DoctorInfo, PatientInfo } from '@/lib/generate-pdf'

// Dans le composant PatientDetailPage, après isPediatrie :
const [doctor, practiceInfo] = await Promise.all([
  getDoctorProfile(tenantId, 'fr'),
  getPracticeInfo(tenantId, 'fr'),
])

const doctorInfo: DoctorInfo | undefined = doctor ? {
  name: doctor.name,
  specialty: doctor.specialty || '',
  rpps: doctor.rpps || '—',
  address: practiceInfo?.address || '',
  phone: practiceInfo?.phone || '',
  city: practiceInfo?.city || '',
} : undefined

const patientInfo: PatientInfo | undefined = patient ? {
  name: patient.fullName,
  age: patient.birthDate ? computeAge(patient.birthDate) : '',
  nationalId: patient.nationalId || undefined,
  birthDate: patient.birthDate || undefined,
} : undefined
```

Puis passer aux composants :

```tsx
<ConsultationForm
  patientId={patient.id}
  consultations={consultations}
  isPediatrie={isPediatrie}
  doctorInfo={doctorInfo}
  patientInfo={patientInfo}
/>
<PrescriptionForm
  patientId={patient.id}
  prescriptions={prescriptions}
  consultations={consultations}
  doctorInfo={doctorInfo}
  patientInfo={patientInfo}
/>
```

---

## Ce qui est hors scope

- **Mise en page complexe** (logos, en-têtes graphiques, filigrane) — le template est fonctionnel et sobre, on pourra l'enrichir plus tard.
- **PDF serveur-side** — pas nécessaire pour le MVP, jsPDF côté client évite les problèmes Vercel.
- **Export WhatsApp** — chantier #6 séparé, utilisera les mêmes fonctions PDF.
- **Signature numérique / cachet électronique** — hors scope légal actuel.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/lib/generate-pdf.ts` | Fonctions PDF partagées (jsPDF) |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/package.json` | Ajouter `jspdf` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Fetch doctor + practiceInfo, passer props |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx` | Props doctorInfo/patientInfo + bouton PDF |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx` | Props doctorInfo/patientInfo + bouton PDF |

---

## Règles obligatoires

1. **jsPDF est client-side** — `generateConsultationPDF` et `generatePrescriptionPDF` sont appelées dans des composants `'use client'` (ConsultationForm et PrescriptionForm le sont déjà).
2. **Design system** : le bouton "PDF" doit être discret (`text-xs text-primary-600`) mais visible.
3. **Pas de `any`** sans justification.
4. **Pas de données patient en dur dans le PDF** — tout vient des props.

## Build gate

```bash
cd apps/frontend && pnpm install && npx tsc --noEmit && npx next build
```

---

## Ordre d'implémentation

1. `pnpm --filter frontend add jspdf`
2. `lib/generate-pdf.ts` — fonctions PDF
3. `ConsultationForm.tsx` — props + bouton PDF
4. `PrescriptionForm.tsx` — props + bouton PDF
5. `patients/[id]/page.tsx` — fetch doctor + practiceInfo, passer props
6. Build gate
