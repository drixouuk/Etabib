# Script : Seed demo — Dr. Demo (données réalistes sur 1 an)

## Contexte

- Le seed existant (`seed.ts`) crée Dr. Guinane (cabinet réel). Aucun patient, consultation, prescription ou file d'attente n'est seedé.
- Besoin : un compte de démonstration `drdemo@gmail.com` avec des données complètes et réalistes sur 12 mois, pour que les prospects/clients puissent tester toutes les fonctionnalités.
- Le script doit être **idempotent** (vérifie si le tenant existe déjà avant de créer) et **indépendant** du seed principal (pas de modification de `seed.ts`).

## Architecture

```
Fichier : apps/cms/src/seed-demo.ts
Exécution : npx payload seed-demo (via un script npm)
OU : POST /api/seed-demo (endpoint dédié)
OU : inclus dans le seed principal avec une variable d'env SEED_DEMO=true
```

**Recommandé** : créer un fichier `seed-demo.ts` autonome, exécutable via un script npm `pnpm --filter cms seed-demo`. Idempotent : si le tenant `demo` existe déjà, log "Déjà seedé" et quitte.

---

## Données à générer

### 1. Tenant + Utilisateur + Docteur

| Champ | Valeur |
|-------|--------|
| Tenant name | `Cabinet Dr. Demo` |
| Tenant domain | `demo.dr-tabibi.ma` |
| Tenant tier | `dossier` |
| Tenant specialty | `pediatrie` |
| User email | `drdemo@gmail.com` |
| User password | `demo1234` (ou via `SEED_DEMO_PASSWORD` env var) |
| User name | `Dr. Demo` |
| User roles | `['tenant_admin', 'doctor']` |
| Doctor name | `Dr. Demo` |
| Doctor slug | `dr-demo` |
| Doctor specialty | `Pédiatre` |
| Doctor RPPS | `123456789` |
| Doctor languages | `[{ language: "Français" }, { language: "العربية" }]` |

### 2. PracticeInfo

| Champ | Valeur |
|-------|--------|
| Address | `123 Avenue Hassan II, Agadir` |
| City | `Agadir` |
| Phone | `+212 5 28 00 00 00` |
| Coordinates | `{ lat: 30.4278, lng: -9.5981 }` |
| Schedules | Lun-Ven 09:00-17:00, Sam 09:00-13:00 |
| Tagline | `Votre enfant, notre priorité` |
| Email | `contact@drdemo.ma` |

### 3. Services (5-6)

- Consultation pédiatrique
- Suivi de croissance
- Vaccination (PNI)
- Conseil en allaitement et nutrition
- Certificats médicaux (école, sport)
- Urgences pédiatriques

### 4. 25 Patients réalistes

Générer des patients avec des noms marocains réalistes, âges variés, genres mixtes. Répartis sur les 12 derniers mois de création.

**À générer en dur dans le script** (pas aléatoire — déterministe pour être reproductible). Exemple de 5 entrées — le script doit en avoir 25 :

```typescript
const PATIENTS = [
  { fullName: 'Yasmine El Amrani', gender: 'girl', birthDate: '2023-03-15', nationalId: 'BK123456', address: 'Agadir', phone: '+212 6 11 22 33 44', createdAt: '2025-08-01', source: 'google', sourceDetail: '' },
  { fullName: 'Adam Benali', gender: 'boy', birthDate: '2024-01-10', nationalId: 'BK789012', address: 'Inezgane', phone: '+212 6 22 33 44 55', createdAt: '2025-08-05', source: 'referring_practitioner', sourceDetail: '' },
  { fullName: 'Sara Mansouri', gender: 'girl', birthDate: '2019-06-20', nationalId: 'BK345678', address: 'Agadir', phone: '+212 6 33 44 55 66', createdAt: '2025-08-12', source: 'instagram', sourceDetail: 'Compte @mamans_agadir' },
  { fullName: 'Omar Idrissi', gender: 'boy', birthDate: '2025-02-28', nationalId: 'BK901234', address: 'Aït Melloul', phone: '+212 6 44 55 66 77', createdAt: '2025-09-03', source: 'connaissance', sourceDetail: '' },
  { fullName: 'Lina Tazi', gender: 'girl', birthDate: '2018-11-05', nationalId: 'BK567890', address: 'Tiznit', phone: '+212 6 55 66 77 88', createdAt: '2025-09-10', source: 'autre_patient', sourceDetail: 'Référée par Mme El Amrani' },
  // ... 20 autres patients avec des patterns similaires
]
```

**Règles pour les 25 patients** :
- Noms marocains variés (El Amrani, Benali, Mansouri, Idrissi, Tazi, Bennani, Ouazzani, Chraibi, Alaoui, Fassi, Kabbaj, Lazrak, Sqalli, Touzani...)
- Prénoms : Yasmine, Adam, Sara, Omar, Lina, Rayan, Ines, Youssef, Nour, Mehdi...
- 13 garçons, 12 filles (approx)
- Âges : de nouveau-né (quelques mois) à 15 ans — majorité < 5 ans (pédiatrie)
- Sources variées : 8 google, 5 referring_practitioner, 4 facebook/instagram, 5 connaissance, 3 autre_patient
- Dates de création : réparties uniformément sur juillet 2025 → juillet 2026 (un ou deux par semaine)
- Adresses : Agadir, Inezgane, Aït Melloul, Tiznit, Dcheira

### 5. 3 Médecins référents

```typescript
const REFERRING_PRACTITIONERS = [
  { name: 'Dr. Karim Tazi', specialty: 'Médecin généraliste', phone: '+212 5 28 11 11 11', city: 'Agadir' },
  { name: 'Dr. Nadia Bennis', specialty: 'Gynécologue', phone: '+212 5 28 22 22 22', city: 'Inezgane' },
  { name: 'Dr. Rachid Ouazzani', specialty: 'Médecin généraliste', phone: '+212 5 28 33 33 33', city: 'Aït Melloul' },
]
```

Les patients avec `source: 'referring_practitioner'` seront liés à l'un de ces 3 référents.

### 6. Consultations (~3-4 par patient)

Pour chaque patient, générer 3-4 consultations espacées de 2-4 mois. Chaque consultation contient :

```typescript
{
  patient: patientId,
  practitioner: demoUserId,
  date: '2026-01-15T10:30:00Z',
  motif: 'Consultation de suivi',  // ou 'Fièvre', 'Toux persistante', 'Vaccin', 'Douleurs abdominales', 'Rhume', 'Contrôle croissance'
  examenClinique: 'Examen ORL normal. Auscultation cardio-pulmonaire sans anomalie. Abdomen souple.',
  poids: 12.5,    // cohérent avec l'âge du patient
  taille: 85.0,   // cohérent avec l'âge
  perimetreCranien: 48.5, // pour les < 2 ans
  diagnostic: 'Rhinopharyngite virale. Évolution favorable.',
  codeActe: 'CS',
}
```

**Règles de cohérence clinique** :
- Poids réaliste par âge (courbe OMS médiane ± 1 écart-type)
- Taille réaliste par âge
- Périmètre crânien uniquement pour les < 2 ans
- Motifs variés : 40% suivi/contrôle, 30% infectieux (ORL, bronchite, gastro), 20% vaccin, 10% autre
- Diagnostics cohérents avec les motifs

### 7. Prescriptions (~1 par patient avec consultation "infectieuse")

Pour les consultations avec motif infectieux, générer une ordonnance :

```typescript
{
  patient: patientId,
  practitioner: demoUserId,
  consultation: consultationId,
  date: consultationDate,
  medications: [
    { nom: 'Doliprane 2.4%', dci: 'Paracétamol', posologie: '1 dose de 15 mg/kg toutes les 6h si fièvre', duree: '3 jours' },
    { nom: 'Amoxicilline 500mg/5ml', dci: 'Amoxicilline', posologie: '1 cuillère-mesure matin et soir', duree: '7 jours' },
  ],
  notes: 'Bien agiter le flacon avant emploi. Conserver au réfrigérateur.',
}
```

### 8. Carnet vaccinal

Pour 15 patients (les autres sont trop jeunes ou ont refusé), enregistrer les vaccins PNI déjà administrés selon leur âge :

| Vaccin | Âge |
|--------|-----|
| BCG | Naissance |
| Hépatite B | Naissance, 1 mois, 6 mois |
| DTCoq-Hib-HepB (Pentavalent) | 2, 4, 6 mois |
| Pneumocoque | 2, 4, 12 mois |
| Rotavirus | 2, 4 mois |
| ROR | 12, 18 mois |
| DTCoq-Polio (rappel) | 18 mois |

Pour chaque patient, calculer quels vaccins auraient dû être administrés selon leur âge et les enregistrer.

### 9. File d'attente

Générer des entrées dans `queue-items` pour les 30 derniers jours, avec des statuts variés :

```typescript
// 5-10 items par jour, la plupart completed, quelques waiting/in_consultation
{
  patient: patientId,
  doctor: doctorId,  // du user (via doctorProfile)
  status: 'completed',
  visitReason: 'consultation',
  arrivalTime: '2026-07-22T09:15:00Z',
}
```

### 10. Templates (3)

```typescript
const TEMPLATES = [
  {
    name: 'Consultation de suivi standard',
    type: 'consultation',
    motif: 'Consultation de suivi',
    examenClinique: 'Examen ORL normal. Auscultation cardio-pulmonaire normale. Abdomen souple et indolore. Pas d\'adénopathies.',
    diagnostic: 'Développement staturo-pondéral normal. Rien à signaler.',
    codeActe: 'CS',
  },
  {
    name: 'Ordonnance rhinopharyngite',
    type: 'prescription',
    medications: [
      { nom: 'Doliprane 2.4%', dci: 'Paracétamol', posologie: '1 dose de 15 mg/kg toutes les 6h si fièvre > 38.5°C', duree: '3 jours' },
      { nom: 'Sérum physiologique', dci: 'Chlorure de sodium', posologie: '1 dosette dans chaque narine 3x/jour', duree: '5 jours' },
    ],
    notes: 'Surveiller la température. Reconsulter si fièvre > 3 jours ou signes de gêne respiratoire.',
  },
  {
    name: 'Ordonnance gastro-entérite',
    type: 'prescription',
    medications: [
      { nom: 'SRO (Soluté de Réhydratation Orale)', dci: 'Sels de réhydratation', posologie: '1 sachet dans 200ml d\'eau, à volonté', duree: 'Pendant la diarrhée' },
      { nom: 'Smecta', dci: 'Diosmectite', posologie: '1 sachet 2x/jour', duree: '3 jours' },
    ],
    notes: 'Surveiller les signes de déshydratation. Fractionner l\'alimentation.',
  },
]
```

---

## Script seed-demo.ts

**Fichier à créer** : `apps/cms/src/seed-demo.ts`

Structure :

```typescript
import type { Payload } from 'payload'

const DEMO_EMAIL = 'drdemo@gmail.com'
const DEMO_DOMAIN = 'demo.dr-tabibi.ma'

export async function seedDemo(payload: Payload) {
  // 1. Vérifier si déjà seedé
  const existing = await payload.find({ collection: 'tenants', where: { domain: { equals: DEMO_DOMAIN } }, limit: 1 })
  if (existing.docs.length > 0) {
    console.log('→ Demo déjà seedé, skipping')
    return
  }

  console.log('🌱 Seeding Dr. Demo...')

  // 2. Créer tenant
  const tenant = await payload.create({ collection: 'tenants', data: { name: 'Cabinet Dr. Demo', domain: DEMO_DOMAIN, settings: { defaultLocale: 'fr', activeTier: 'dossier', specialty: 'pediatrie' } } })
  console.log('✅ Tenant')

  // 3. Créer utilisateur
  const password = process.env.SEED_DEMO_PASSWORD || 'demo1234'
  const user = await payload.create({ collection: 'users', data: { email: DEMO_EMAIL, password, name: 'Dr. Demo', roles: ['tenant_admin', 'doctor'], tenant: tenant.id } })
  console.log('✅ User')

  // 4. Créer fiche docteur
  const doctor = await payload.create({ collection: 'doctors', data: { tenant: tenant.id, name: 'Dr. Demo', slug: 'dr-demo', specialty: 'Pédiatre', rpps: '123456789', languages: [{ language: 'Français' }, { language: 'العربية' }] } })
  // Mise à jour de la spécialité localisée
  await payload.update({ collection: 'doctors', id: doctor.id, data: { specialty: 'Pédiatre' }, locale: 'fr' })
  await payload.update({ collection: 'doctors', id: doctor.id, data: { specialty: 'Pediatrician' }, locale: 'en' })
  console.log('✅ Doctor')

  // 5. Lier User → Doctor
  await payload.update({ collection: 'users', id: user.id, data: { doctorProfile: doctor.id } })
  console.log('✅ Linked User → Doctor')

  // 6. PracticeInfo (global)
  await payload.updateGlobal({ slug: 'practice-info', data: { /* ... */ } })
  console.log('✅ PracticeInfo')

  // 7. Services
  for (const s of SERVICES) {
    await payload.create({ collection: 'services', data: { tenant: tenant.id, ...s } })
  }
  console.log('✅ Services')

  // 8. Médecins référents
  const referents: Record<string, any> = {}
  for (const r of REFERRING_PRACTITIONERS) {
    const ref = await payload.create({ collection: 'referring-practitioners', data: { tenant: tenant.id, ...r } })
    referents[r.name] = ref
  }
  console.log('✅ Referring practitioners')

  // 9. Patients (25) — créés en boucle
  const patients: any[] = []
  for (const pData of PATIENTS) {
    const p = await payload.create({ collection: 'patients', data: { ...pData, tenant: tenant.id } })
    patients.push(p)
  }
  console.log(`✅ ${patients.length} patients`)

  // 10. Consultations — 3-4 par patient
  let consCount = 0
  for (const patient of patients) {
    for (const cData of getConsultations(patient)) {
      await payload.create({ collection: 'consultations', data: { ...cData, tenant: tenant.id, patient: patient.id, practitioner: user.id } })
      consCount++
    }
  }
  console.log(`✅ ${consCount} consultations`)

  // 11. Prescriptions — pour consultations avec motif infectieux
  let prescCount = 0
  const consultations = await payload.find({ collection: 'consultations', where: { tenant: { equals: tenant.id } }, limit: 500 })
  for (const c of consultations.docs) {
    if (shouldPrescribe(c)) {
      await payload.create({ collection: 'prescriptions', data: { ...getPrescription(c), tenant: tenant.id, patient: c.patient, practitioner: user.id } })
      prescCount++
    }
  }
  console.log(`✅ ${prescCount} prescriptions`)

  // 12. Vaccinations
  let vaccCount = 0
  for (const patient of patients) {
    for (const vData of getVaccinations(patient)) {
      await payload.create({ collection: 'vaccinations', data: { ...vData, tenant: tenant.id, patient: patient.id, practitioner: user.id } })
      vaccCount++
    }
  }
  console.log(`✅ ${vaccCount} vaccinations`)

  // 13. File d'attente (30 derniers jours)
  let queueCount = 0
  for (const item of generateQueue(demoUserId, patients)) {
    await payload.create({ collection: 'queue-items', data: { ...item, tenant: tenant.id } })
    queueCount++
  }
  console.log(`✅ ${queueCount} queue items`)

  // 14. Templates
  for (const t of TEMPLATES) {
    await payload.create({ collection: 'templates', data: { ...t, tenant: tenant.id } })
  }
  console.log('✅ Templates')

  console.log('🎉 Demo seed complete — drdemo@gmail.com / demo1234')
}
```

---

## Exécution

1. Ajouter un script npm dans `apps/cms/package.json` :

```json
"seed-demo": "npx tsx src/seed-demo-runner.ts"
```

2. **Fichier à créer** : `apps/cms/src/seed-demo-runner.ts`

```typescript
import { getPayload } from 'payload'
import config from './payload.config'
import { seedDemo } from './seed-demo'

async function run() {
  const payload = await getPayload({ config })
  await seedDemo(payload)
  process.exit(0)
}
run()
```

3. Exécution : `pnpm --filter cms seed-demo`

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/cms/src/seed-demo.ts` | Fonction seed principale + données inline |
| `apps/cms/src/seed-demo-runner.ts` | Point d'entrée exécutable |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/package.json` | Ajouter script `seed-demo` |

---

## Règles obligatoires

1. **Idempotent** : vérifier `domain === 'demo.dr-tabibi.ma'` avant de créer → si existe, skip.
2. **Déterministe** : toutes les données sont en dur dans le script (dates, noms, mesures). Pas de `Math.random()`.
3. **Cohérence clinique** : poids/taille cohérents avec l'âge (courbes OMS). Diagnostics cohérents avec les motifs.
4. **Mot de passe** : `SEED_DEMO_PASSWORD` env var ou fallback `demo1234`.
5. **Pas de `any`** non justifié (les types Payload sont laxistes, utiliser `as any` uniquement pour les payloads de création).
6. **Pas de migration** nécessaire — c'est un seed, pas un changement de schéma.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
```

Vérifier que le script s'exécute sans erreur sur une base vierge.
