import type { Payload } from 'payload'

const DEMO_EMAIL = 'drdemo@gmail.com'
const DEMO_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ? `demo.${process.env.NEXT_PUBLIC_SITE_DOMAIN}` : 'demo.etabibi.ma'

const SERVICES = [
  { title: 'Consultation pédiatrique', icon: 'Stethoscope', order: 1, description: '' },
  { title: 'Suivi de croissance', icon: 'GrowthIcon', order: 2, description: '' },
  { title: 'Vaccination (PNI)', icon: 'Syringe', order: 3, description: '' },
  { title: 'Conseil en allaitement et nutrition', icon: 'Apple', order: 4, description: '' },
  { title: 'Certificats médicaux', icon: 'FileCheck', order: 5, description: '' },
  { title: 'Urgences pédiatriques', icon: 'Clock', order: 6, description: '' },
]

const REFERRING_PRACTITIONERS = [
  { name: 'Dr. Karim Tazi', specialty: 'Médecin généraliste', phone: '+212 5 28 11 11 11', city: 'Agadir' },
  { name: 'Dr. Nadia Bennis', specialty: 'Gynécologue', phone: '+212 5 28 22 22 22', city: 'Inezgane' },
  { name: 'Dr. Rachid Ouazzani', specialty: 'Médecin généraliste', phone: '+212 5 28 33 33 33', city: 'Aït Melloul' },
]

const PATIENTS: Record<string, any>[] = [
  { fullName: 'Yasmine El Amrani', gender: 'girl', birthDate: '2023-03-15', nationalId: 'BK123456', address: 'Agadir', phone: '+212 6 11 22 33 44', createdAt: '2025-07-01', patientSource: 'google' , cnssRegistrationNumber: '100100000', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Adam Benali', gender: 'boy', birthDate: '2024-01-10', nationalId: 'BK789012', address: 'Inezgane', phone: '+212 6 22 33 44 55', createdAt: '2025-07-05', patientSource: 'referring_practitioner' , cnssRegistrationNumber: '100107919', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Sara Mansouri', gender: 'girl', birthDate: '2019-06-20', nationalId: 'BK345678', address: 'Agadir', phone: '+212 6 33 44 55 66', createdAt: '2025-07-12', patientSource: 'instagram', patientSourceDetail: 'Compte @mamans_agadir' , cnssRegistrationNumber: '100115838', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Omar Idrissi', gender: 'boy', birthDate: '2025-02-28', nationalId: 'BK901234', address: 'Aït Melloul', phone: '+212 6 44 55 66 77', createdAt: '2025-07-20', patientSource: 'connaissance' , cnssRegistrationNumber: '100123757', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Lina Tazi', gender: 'girl', birthDate: '2018-11-05', nationalId: 'BK567890', address: 'Tiznit', phone: '+212 6 55 66 77 88', createdAt: '2025-08-01', patientSource: 'autre_patient', patientSourceDetail: 'Référée par Mme El Amrani' , cnssRegistrationNumber: '100131676', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Rayan Bennani', gender: 'boy', birthDate: '2022-08-12', nationalId: 'BK246801', address: 'Agadir', phone: '+212 6 66 77 88 99', createdAt: '2025-08-08', patientSource: 'google' , cnssRegistrationNumber: '100139595', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Ines Ouazzani', gender: 'girl', birthDate: '2020-04-30', nationalId: 'BK135790', address: 'Dcheira', phone: '+212 6 77 88 99 00', createdAt: '2025-08-15', patientSource: 'facebook', patientSourceDetail: 'Groupe Facebook Mamans Souss' , cnssRegistrationNumber: '100147514', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Youssef Chraibi', gender: 'boy', birthDate: '2024-06-18', nationalId: 'BK864209', address: 'Inezgane', phone: '+212 6 88 99 00 11', createdAt: '2025-09-01', patientSource: 'connaissance' , cnssRegistrationNumber: '100155433', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Nour Alaoui', gender: 'girl', birthDate: '2021-01-22', nationalId: 'BK975310', address: 'Agadir', phone: '+212 6 99 00 11 22', createdAt: '2025-09-10', patientSource: 'google' , cnssRegistrationNumber: '100163352', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Mehdi Fassi', gender: 'boy', birthDate: '2023-09-14', nationalId: 'BK753190', address: 'Tiznit', phone: '+212 6 00 11 22 33', createdAt: '2025-09-18', patientSource: 'referring_practitioner' , cnssRegistrationNumber: '100171271', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Hiba Kabbaj', gender: 'girl', birthDate: '2020-11-08', nationalId: 'BK468024', address: 'Aït Melloul', phone: '+212 6 11 22 33 55', createdAt: '2025-10-01', patientSource: 'instagram', patientSourceDetail: 'Compte @mamans_agadir' , cnssRegistrationNumber: '100179190', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Amine Lazrak', gender: 'boy', birthDate: '2024-03-25', nationalId: 'BK579135', address: 'Agadir', phone: '+212 6 22 33 44 66', createdAt: '2025-10-10', patientSource: 'connaissance' , cnssRegistrationNumber: '100187109', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Kenza Sqalli', gender: 'girl', birthDate: '2019-08-15', nationalId: 'BK680246', address: 'Inezgane', phone: '+212 6 33 44 55 77', createdAt: '2025-10-20', patientSource: 'google' , cnssRegistrationNumber: '100195028', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Walid Touzani', gender: 'boy', birthDate: '2022-01-05', nationalId: 'BK791357', address: 'Dcheira', phone: '+212 6 44 55 66 88', createdAt: '2025-11-01', patientSource: 'referring_practitioner' , cnssRegistrationNumber: '100202947', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Maya Bennani', gender: 'girl', birthDate: '2020-07-19', nationalId: 'BK802468', address: 'Agadir', phone: '+212 6 55 66 77 99', createdAt: '2025-11-08', patientSource: 'google' , cnssRegistrationNumber: '100210866', cnssRegime: 'ayant_droit', cnssCardUploadedAt: '2026-01-15' },
  { fullName: 'Ismail El Amrani', gender: 'boy', birthDate: '2024-10-01', nationalId: 'BK913579', address: 'Tiznit', phone: '+212 6 66 77 88 00', createdAt: '2025-11-15', patientSource: 'connaissance' , cnssRegistrationNumber: '100218785', cnssRegime: 'salarie', cnssCardUploadedAt: null },
  { fullName: 'Layla Mansouri', gender: 'girl', birthDate: '2018-03-12', nationalId: 'BK024680', address: 'Aït Melloul', phone: '+212 6 77 88 99 11', createdAt: '2025-12-01', patientSource: 'facebook', patientSourceDetail: 'Groupe Facebook Mamans Souss' , cnssRegistrationNumber: '100226704', cnssRegime: 'salarie', cnssCardUploadedAt: null },
  { fullName: 'Ayoub Chraibi', gender: 'boy', birthDate: '2023-05-20', nationalId: 'BK135791', address: 'Agadir', phone: '+212 6 88 99 00 22', createdAt: '2025-12-10', patientSource: 'google' , cnssRegistrationNumber: '100234623', cnssRegime: 'etudiant', cnssCardUploadedAt: null },
  { fullName: 'Rania Idrissi', gender: 'girl', birthDate: '2021-10-14', nationalId: 'BK246802', address: 'Inezgane', phone: '+212 6 99 00 11 33', createdAt: '2026-01-05', patientSource: 'autre_patient', patientSourceDetail: 'Référée par la famille Bennani' },
  { fullName: 'Zakaria Tazi', gender: 'boy', birthDate: '2024-12-01', nationalId: 'BK357913', address: 'Dcheira', phone: '+212 6 00 11 22 44', createdAt: '2026-01-15', patientSource: 'google' },
  { fullName: 'Mariam Benali', gender: 'girl', birthDate: '2020-02-28', nationalId: 'BK468024', address: 'Agadir', phone: '+212 6 11 22 33 66', createdAt: '2026-02-01', patientSource: 'google' },
  { fullName: 'Sami Ouazzani', gender: 'boy', birthDate: '2022-06-15', nationalId: 'BK579135', address: 'Tiznit', phone: '+212 6 22 33 44 77', createdAt: '2026-02-10', patientSource: 'referring_practitioner' },
  { fullName: 'Imane Fassi', gender: 'girl', birthDate: '2023-11-30', nationalId: 'BK680246', address: 'Aït Melloul', phone: '+212 6 33 44 55 88', createdAt: '2026-03-01', patientSource: 'facebook', patientSourceDetail: 'Publicité Facebook' },
  { fullName: 'Adnane Kabbaj', gender: 'boy', birthDate: '2025-01-15', nationalId: 'BK791357', address: 'Agadir', phone: '+212 6 44 55 66 99', createdAt: '2026-04-01', patientSource: 'autre_patient', patientSourceDetail: 'Référé par la famille Tazi' },
  { fullName: 'Salma Lazrak', gender: 'girl', birthDate: '2024-08-22', nationalId: 'BK802468', address: 'Inezgane', phone: '+212 6 55 66 77 00', createdAt: '2026-05-01', patientSource: 'google' },
]

function getWeightForAge(ageMonths: number, gender: string, vari: number): number {
  const base = gender === 'boy' ? [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 9.9, 10.1, 10.3, 10.5, 10.7, 10.9, 11.1, 11.3, 11.5, 11.7, 11.8, 12.0] : [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9, 9.1, 9.3, 9.5, 9.7, 9.9, 10.1, 10.3, 10.5, 10.7, 10.9, 11.1, 11.3]
  const idx = Math.min(ageMonths, 24)
  const w = base[idx] || (gender === 'boy' ? 12.0 + (ageMonths - 24) * 0.25 : 11.3 + (ageMonths - 24) * 0.25)
  return Math.round((w + vari * 0.8) * 10) / 10
}

function getHeightForAge(ageMonths: number, gender: string, vari: number): number {
  const base = gender === 'boy' ? [50, 55, 58, 61, 64, 66, 68, 69, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88] : [49, 54, 57, 60, 62, 64, 66, 67, 69, 70, 71, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86]
  const idx = Math.min(ageMonths, 24)
  const h = base[idx] || (86 + (ageMonths - 24) * 0.5)
  return Math.round((h + vari * 2) * 10) / 10
}

function ageMonths(bd: string, ref: string): number {
  const b = new Date(bd); const r = new Date(ref)
  return (r.getFullYear() - b.getFullYear()) * 12 + r.getMonth() - b.getMonth()
}

const MOTIFS = ['Consultation de suivi', 'Fièvre', 'Toux persistante', 'Douleurs abdominales', 'Rhume', 'Gastro-entérite', 'Bronchite', 'Otite', 'Allergie saisonnière', 'Vaccin du calendrier', 'Contrôle de croissance', 'Éruption cutanée', 'Conjonctivite']
const DIAGS: Record<string, string> = {
  'Consultation de suivi': 'Développement staturo-pondéral satisfaisant. Examen clinique sans anomalie.',
  'Fièvre': 'Syndrome fébrile d\'allure virale. Pas de signe de gravité.',
  'Toux persistante': 'Bronchite aiguë. Pas de signe de détresse respiratoire.',
  'Douleurs abdominales': 'Douleurs abdominales fonctionnelles. Examen clinique rassurant.',
  'Rhume': 'Rhinopharyngite aiguë. Otoscopie normale.',
  'Gastro-entérite': 'Gastro-entérite aiguë sans signe de déshydratation.',
  'Bronchite': 'Bronchiolite légère. Saturation normale.',
  'Otite': 'Otite moyenne aiguë unilatérale.',
  'Allergie saisonnière': 'Rhinite allergique saisonnière.',
  'Vaccin du calendrier': 'Bonne tolérance du vaccin. Examen pré-vaccinal normal.',
  'Contrôle de croissance': 'Courbe de croissance harmonieuse. Poids et taille dans les normes.',
  'Éruption cutanée': 'Urticaire aiguë d\'origine allergique présumée.',
  'Conjonctivite': 'Conjonctivite infectieuse bilatérale.',
}

const MEDS: Record<string, { nom: string; dci: string; posologie: string; duree: string }[]> = {
  'Fièvre': [{ nom: 'Doliprane 2.4%', dci: 'Paracétamol', posologie: '1 dose de 15 mg/kg toutes les 6h si fièvre > 38.5°C', duree: '3 jours' }],
  'Toux persistante': [{ nom: 'Mucofluid', dci: 'Carbocistéine', posologie: '1 cuillère-mesure 2x/jour', duree: '5 jours' }, { nom: 'Sérum physiologique', dci: 'Chlorure de sodium', posologie: '1 dosette dans chaque narine 3x/jour', duree: '5 jours' }],
  'Douleurs abdominales': [{ nom: 'Smecta', dci: 'Diosmectite', posologie: '1 sachet 2x/jour', duree: '3 jours' }, { nom: 'Débridat', dci: 'Trimébutine', posologie: '1 cuillère-mesure 3x/jour avant les repas', duree: '5 jours' }],
  'Rhume': [{ nom: 'Sérum physiologique', dci: 'Chlorure de sodium', posologie: '1 dosette dans chaque narine 3x/jour', duree: '5 jours' }, { nom: 'Doliprane 2.4%', dci: 'Paracétamol', posologie: '1 dose de 15 mg/kg si fièvre', duree: 'Si besoin' }],
  'Gastro-entérite': [{ nom: 'SRO', dci: 'Sels de réhydratation', posologie: '1 sachet dans 200ml d\'eau, à volonté', duree: 'Pendant la diarrhée' }, { nom: 'Smecta', dci: 'Diosmectite', posologie: '1 sachet 2x/jour', duree: '3 jours' }],
  'Bronchite': [{ nom: 'Amoxicilline 500mg/5ml', dci: 'Amoxicilline', posologie: '1 cuillère-mesure 2x/jour', duree: '7 jours' }, { nom: 'Mucofluid', dci: 'Carbocistéine', posologie: '1 cuillère-mesure 2x/jour', duree: '5 jours' }],
  'Otite': [{ nom: 'Amoxicilline 500mg/5ml', dci: 'Amoxicilline', posologie: '1 cuillère-mesure 2x/jour', duree: '7 jours' }, { nom: 'Doliprane 2.4%', dci: 'Paracétamol', posologie: '1 dose de 15 mg/kg si douleur', duree: 'Si besoin' }],
  'Conjonctivite': [{ nom: 'Cébémyxine collyre', dci: 'Chloramphénicol', posologie: '1 goutte 4x/jour dans chaque œil', duree: '7 jours' }],
  'Éruption cutanée': [{ nom: 'Cétirizine sirop', dci: 'Cétirizine', posologie: '1 cuillère-mesure 1x/jour le soir', duree: '5 jours' }, { nom: 'Léniprur', dci: 'Zinc + soufre', posologie: 'Application locale 2x/jour', duree: '5 jours' }],
}

function getConsultationsForPatient(patient: any): any[] {
  const birth = patient.birthDate
  const gender = patient.gender
  const cons: any[] = []
  const visits = 3 + (patient.createdAt.endsWith('01') ? 1 : 0)
  const baseDates = [0, 2, 4, 6].slice(0, visits)
  for (let i = 0; i < baseDates.length; i++) {
    const consDate = new Date(patient.createdAt)
    consDate.setMonth(consDate.getMonth() + baseDates[i] * 1.5)
    if (consDate > new Date()) continue
    const iso = consDate.toISOString()
    const am = ageMonths(birth, iso)
    const vari = (i * 0.5 - 0.5)
    const motif = (i === 1) ? 'Fièvre' : (i === 2) ? 'Toux persistante' : (i === 3) ? 'Gastro-entérite' : MOTIFS[i % MOTIFS.length]
    const diag = DIAGS[motif] || 'Examen clinique normal.'
    const p = getWeightForAge(am, gender, vari)
    const t = getHeightForAge(am, gender, vari)
    const c: any = { date: iso, motif, examenClinique: 'Examen clinique complet sans particularité. Développement harmonieux.', poids: p, taille: t, diagnostic: diag, codeActe: 'CS' }
    if (am < 24) c.perimetreCranien = Math.round((34 + am * 0.35 + vari) * 10) / 10
    if (MOTIFS.indexOf(motif) !== -1) c.motif = motif
    // Suivi FSE (CNSS-3) — répartitions démo, 100% fictives :
    // - patient sans immatriculation → jamais de statut FSE (non_envoyee)
    // - anciennes (>60 j) : remboursee ~60% / acceptee ~15% / rejetee ~5%
    // - fenêtre 31-60 j : délibérément 'envoyee' → badge « délai anormal »
    //   visible (>30 j sans retour CNSS)
    // - récentes (<=30 j) : envoyee / non_envoyee
    // fseStatusUpdatedAt est posé par le hook beforeChange (create).
    const daysOld = (Date.now() - consDate.getTime()) / 86400000
    if (!patient.cnssRegistrationNumber) {
      c.fseStatus = 'non_envoyee'
    } else if (daysOld > 30 && daysOld <= 60) {
      c.fseStatus = 'envoyee'
      c.fseSentAt = iso
    } else if (daysOld > 60) {
      const r = (Number(patient.id) + i * 7) % 20
      c.fseStatus = r < 12 ? 'remboursee' : r < 15 ? 'acceptee' : r < 16 ? 'rejetee' : 'non_envoyee'
      if (c.fseStatus !== 'non_envoyee') c.fseSentAt = iso
    } else if (daysOld <= 30 && daysOld > 0) {
      c.fseStatus = i % 2 === 0 ? 'envoyee' : 'non_envoyee'
      if (c.fseStatus === 'envoyee') c.fseSentAt = iso
    } else {
      c.fseStatus = 'non_envoyee'
    }
    cons.push(c)
  }
  return cons
}

function shouldPrescribe(motif: string): boolean {
  return ['Fièvre', 'Toux persistante', 'Douleurs abdominales', 'Rhume', 'Gastro-entérite', 'Bronchite', 'Otite', 'Conjonctivite', 'Éruption cutanée'].includes(motif)
}

const VACCINE_SCHEDULE = [
  { name: 'BCG', dose: 'Dose unique', age: 0 },
  { name: 'Hépatite B', dose: 'Dose 1', age: 0 },
  { name: 'Pentavalent DTC-Hib-HepB', dose: 'Dose 1', age: 2 },
  { name: 'VPI', dose: 'Dose 1', age: 2 },
  { name: 'Pneumocoque', dose: 'Dose 1', age: 2 },
  { name: 'Pentavalent DTC-Hib-HepB', dose: 'Dose 2', age: 4 },
  { name: 'VPI', dose: 'Dose 2', age: 4 },
  { name: 'Pneumocoque', dose: 'Rappel', age: 4 },
  { name: 'Pentavalent DTC-Hib-HepB', dose: 'Dose 3', age: 6 },
  { name: 'VPI', dose: 'Dose 3', age: 6 },
  { name: 'Rougeole / ROR', dose: 'Dose 1', age: 9 },
  { name: 'Pneumocoque', dose: 'Rappel 12 mois', age: 12 },
  { name: 'ROR', dose: 'Dose 2', age: 12 },
  { name: 'Rappel DTC-Polio', dose: 'Rappel 18 mois', age: 18 },
]

function getVaccinationsForPatient(patient: any): any[] {
  const birth = new Date(patient.birthDate)
  const now = new Date()
  const ageM = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  const v: any[] = []
  for (const vs of VACCINE_SCHEDULE) {
    if (ageM >= vs.age) {
      const doseDate = new Date(birth)
      doseDate.setMonth(doseDate.getMonth() + vs.age)
      v.push({ vaccineName: vs.name, doseLabel: vs.dose, dateAdministered: doseDate.toISOString(), status: 'administered' })
    }
  }
  return v
}

function generateQueue(userId: string, patients: any[]): any[] {
  const items: any[] = []
  for (let day = 1; day <= 30; day++) {
    const count = 2 + (day % 3)
    for (let i = 0; i < count && i < patients.length; i++) {
      const d = new Date()
      d.setDate(d.getDate() - 30 + day)
      d.setHours(9 + i * 2, 15 + i * 10, 0, 0)
      const isPast = d < new Date()
      items.push({
        patient: patients[(day + i) % patients.length].id,
        status: isPast ? 'completed' : (i === 0 ? 'waiting' : 'in_consultation'),
        visitReason: ['consultation', 'consultation', 'controle', 'vaccin', 'urgence'][i % 5],
        arrivalTime: d.toISOString(),
      })
    }
  }
  return items
}

const TEMPLATES = [
  { name: 'Consultation de suivi standard', type: 'consultation', motif: 'Consultation de suivi', examenClinique: 'Examen ORL normal. Auscultation cardio-pulmonaire normale. Abdomen souple et indolore.', diagnostic: 'Développement staturo-pondéral normal.', codeActe: 'CS' },
  { name: 'Ordonnance rhinopharyngite', type: 'prescription', medications: [{ nom: 'Doliprane 2.4%', dci: 'Paracétamol', posologie: '1 dose de 15 mg/kg toutes les 6h si fièvre > 38.5°C', duree: '3 jours' }, { nom: 'Sérum physiologique', dci: 'Chlorure de sodium', posologie: '1 dosette dans chaque narine 3x/jour', duree: '5 jours' }], notes: 'Surveiller la température. Reconsulter si fièvre > 3 jours.' },
  { name: 'Ordonnance gastro-entérite', type: 'prescription', medications: [{ nom: 'SRO', dci: 'Sels de réhydratation', posologie: '1 sachet dans 200ml d\'eau, à volonté', duree: 'Pendant la diarrhée' }, { nom: 'Smecta', dci: 'Diosmectite', posologie: '1 sachet 2x/jour', duree: '3 jours' }], notes: 'Surveiller les signes de déshydratation.' },
]

export async function seedDemo(payload: Payload) {
  const existing = await (payload as any).find({ collection: 'tenants', where: { domain: { equals: DEMO_DOMAIN } }, limit: 1 })
  if (existing.docs.length > 0) { console.log('→ Demo déjà seedé, skipping'); return }
  console.log('🌱 Seeding Dr. Demo...')

  const tenant = await (payload as any).create({ collection: 'tenants', data: { name: 'Cabinet Dr. Demo', domain: DEMO_DOMAIN, settings: { defaultLocale: 'fr', activeTier: 'cabinet', specialty: 'pediatrie' } } })
  console.log('✅ Tenant')

  const password = process.env.SEED_DEMO_PASSWORD || 'demo1234'
  const user = await (payload as any).create({ collection: 'users', data: { email: DEMO_EMAIL, password, name: 'Dr. Demo', roles: ['tenant_admin', 'doctor'], tenant: tenant.id } })
  console.log('✅ User')

  const doctor = await (payload as any).create({ collection: 'doctors', data: { tenant: tenant.id, name: 'Dr. Demo', slug: 'dr-demo', rpps: '123456789', languages: [{ language: 'Français' }, { language: 'العربية' }] } })
  await (payload as any).update({ collection: 'doctors', id: doctor.id, data: { specialty: 'Pédiatre' }, locale: 'fr' })
  await (payload as any).update({ collection: 'doctors', id: doctor.id, data: { specialty: 'Pediatrician' }, locale: 'en' })
  console.log('✅ Doctor')

  await (payload as any).update({ collection: 'users', id: user.id, data: { doctorProfile: doctor.id } })
  console.log('✅ Linked User→Doctor')

  try {
    await (payload as any).updateGlobal({ slug: 'practice-info', data: {
      address: '123 Avenue Hassan II, Agadir', city: 'Agadir', phone: '+212 5 28 00 00 00', tagline: 'Votre enfant, notre priorité',
      coordinates: { lat: 30.4278, lng: -9.5981 }, email: 'contact@drdemo.ma',
      schedules: [{ day: 'Lun–Ven / الإثنين–الجمعة', open: '09:00', close: '17:00' }, { day: 'Sam / السبت', open: '09:00', close: '13:00' }],
    } })
    console.log('✅ PracticeInfo')
  } catch { console.log('⚠️ PracticeInfo skipped') }

  for (const s of SERVICES) {
    await (payload as any).create({ collection: 'services', data: { tenant: tenant.id, ...s } })
  }
  console.log('✅ Services')

  const refs: Record<string, any> = {}
  for (const r of REFERRING_PRACTITIONERS) {
    const ref = await (payload as any).create({ collection: 'referring-practitioners', data: { tenant: tenant.id, ...r } })
    refs[r.name] = ref
  }
  console.log('✅ Referring practitioners')

  const patients: any[] = []
  for (const pData of PATIENTS) {
    const p = await (payload as any).create({ collection: 'patients', data: { ...pData, tenant: tenant.id } })
    patients.push(p)
  }
  console.log(`✅ ${patients.length} patients`)

  let consCount = 0
  for (const patient of patients) {
    const consData = getConsultationsForPatient(patient)
    for (const cData of consData) {
      await (payload as any).create({ collection: 'consultations', data: { ...cData, tenant: tenant.id, patient: patient.id, practitioner: user.id } })
      consCount++
    }
  }
  console.log(`✅ ${consCount} consultations`)

  const allCons = await (payload as any).find({ collection: 'consultations', where: { tenant: { equals: tenant.id } }, limit: 500, depth: 1 })
  let prescCount = 0
  for (const c of allCons.docs || []) {
    if (shouldPrescribe(c.motif)) {
      const medKey = c.motif
      const meds = MEDS[medKey] || MEDS['Fièvre']
      await (payload as any).create({ collection: 'prescriptions', data: { tenant: tenant.id, patient: c.patient, practitioner: user.id, consultation: c.id, date: c.date, medications: meds, notes: 'À prendre selon les recommandations.' } })
      prescCount++
    }
  }
  console.log(`✅ ${prescCount} prescriptions`)

  let vaccCount = 0
  for (const patient of patients) {
    for (const vData of getVaccinationsForPatient(patient)) {
      try { await (payload as any).create({ collection: 'vaccinations', data: { ...vData, tenant: tenant.id, patient: patient.id, practitioner: user.id } }); vaccCount++ } catch { /* skip duplicates */ }
    }
  }
  console.log(`✅ ${vaccCount} vaccinations`)

  let queueCount = 0
  const qItems = generateQueue(user.id, patients)
  for (const item of qItems) {
    try { await (payload as any).create({ collection: 'queue-items', data: { ...item, tenant: tenant.id } }); queueCount++ } catch { /* */ }
  }
  console.log(`✅ ${queueCount} queue items`)

  for (const t of TEMPLATES) {
    await (payload as any).create({ collection: 'templates', data: { ...t, tenant: tenant.id } })
  }
  console.log('✅ Templates')

  console.log('🎉 Demo seed complete — drdemo@gmail.com / demo1234')
}
