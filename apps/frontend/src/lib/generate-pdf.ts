import { jsPDF } from 'jspdf'
import { BRAND } from '@/lib/brand'

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
  const pageW = 210
  const margin = 20

  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageW - margin * 2, 40)

  doc.setFontSize(16)
  doc.setTextColor(13, 148, 136)
  doc.text(`Dr ${doctor.name}`, pageW / 2, margin + 12, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const subtitle = [doctor.specialty, doctor.rpps !== '—' ? `RPPS: ${doctor.rpps}` : ''].filter(Boolean).join(' — ')
  doc.text(subtitle, pageW / 2, margin + 20, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  const contact = [doctor.address, doctor.city, doctor.phone].filter(Boolean).join(' · ')
  doc.text(contact, pageW / 2, margin + 26, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(13, 148, 136)
  doc.text(title, pageW / 2, margin + 34, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(date, pageW - margin, margin + 34, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  const patientLine = [
    `Patient : ${patient.name}`,
    patient.age ? `Âge : ${patient.age}` : '',
    patient.nationalId ? `CIN : ${patient.nationalId}` : '',
  ].filter(Boolean).join('  |  ')
  doc.text(patientLine, margin, margin + 48)

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, margin + 52, pageW - margin, margin + 52)

  return margin + 56
}

function addFooter(doc: jsPDF) {
  const pageW = 210
  const margin = 20
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Page ${doc.getNumberOfPages()}`, pageW / 2, 290, { align: 'center' })

  // ... (le reste du fichier inchangé)
  doc.text(`Document généré par ${BRAND.name} — ${BRAND.tagline}`, pageW / 2, 294, { align: 'center' })
}

export function generatePrescriptionPDF(
  doctor: DoctorInfo,
  patient: PatientInfo,
  data: { date: string; medications: { nom: string; dci: string; posologie: string; duree: string }[]; notes?: string | null },
) {
  const doc = new jsPDF()
  const pageW = 210
  const margin = 20
  let y = addHeader(doc, doctor, patient, 'ORDONNANCE MÉDICALE', data.date)

  data.medications.forEach((med, i) => {
    if (y > 260) { doc.addPage(); y = margin }
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
    doc.text(`Posologie : ${med.posologie}  |  Durée : ${med.duree}`, margin + 8, y)
    y += 10
    if (i < data.medications.length - 1) {
      doc.setDrawColor(230, 230, 230)
      doc.line(margin + 8, y - 3, pageW - margin, y - 3)
    }
  })

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

  y += 20
  if (y > 270) { doc.addPage(); y = margin + 10 }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Signature du médecin :', pageW - margin - 40, y)
  doc.line(pageW - margin - 40, y + 12, pageW - margin, y + 12)

  addFooter(doc)
  doc.save(`ordonnance-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

export function generateConsultationPDF(
  doctor: DoctorInfo,
  patient: PatientInfo,
  data: { date: string; motif?: string | null; diagnostic?: string | null; poids?: number | null; taille?: number | null; perimetreCranien?: number | null },
) {
  const doc = new jsPDF()
  const margin = 20
  const pageW = 210
  let y = addHeader(doc, doctor, patient, 'CERTIFICAT DE CONSULTATION', data.date)

  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)

  if (data.motif) {
    doc.setFont('helvetica', 'bold')
    doc.text('Motif de consultation :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 7
    doc.text(data.motif, margin + 5, y, { maxWidth: pageW - margin * 2 - 5 })
    y += 10
  }

  const mesures = [data.poids ? `Poids : ${data.poids} kg` : '', data.taille ? `Taille : ${data.taille} cm` : '', data.perimetreCranien ? `PC : ${data.perimetreCranien} cm` : ''].filter(Boolean)
  if (mesures.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Mesures :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 7
    doc.text(mesures.join('  |  '), margin + 5, y)
    y += 10
  }

  if (data.diagnostic) {
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnostic :', margin, y)
    doc.setFont('helvetica', 'normal')
    y += 7
    doc.text(data.diagnostic, margin + 5, y, { maxWidth: pageW - margin * 2 - 5 })
    y += 10
  }

  y += 10
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Certificat remis au patient pour justificatif. Ne constitue pas un arrêt de travail.', margin, y, { maxWidth: pageW - margin * 2 })

  y += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.text('Signature du médecin :', pageW - margin - 40, y)
  doc.line(pageW - margin - 40, y + 12, pageW - margin, y + 12)

  addFooter(doc)
  doc.save(`consultation-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
