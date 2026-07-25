# Spec — Dossier médical structuré (Consultations / Prescriptions / Documents)

**Statut** : proposition, à valider avant envoi à Kilo Code
**Base** : audit de code direct sur `apps/cms` et `apps/frontend` (commit `0ec13b1`), croisé avec `docs/Roadmap amo fse dmp.md`

---

## 1. Pourquoi ces 3 collections et pas une seule

Actuellement `Patients.medicalNotes` est un textarea unique. Ça ne permet ni historique daté, ni ordonnances structurées, ni pièces jointes. On sépare en 3 collections liées à `patients`, chacune avec sa propre granularité :

- **Consultations** — un événement daté : motif, examen, mesures, diagnostic
- **Prescriptions** — un ou plusieurs médicaments, rattachés à une consultation (ou émis seuls, ex. renouvellement)
- **Documents** — fichiers (radios, bilans, certificats), **jamais** dans la collection `Media` existante (voir §3)

Toutes les trois suivent le pattern déjà en place sur `Patients.ts` : `tenant` auto-assigné par hook `beforeChange`, lecture/écriture filtrée par tenant.

---

## 2. Schémas proposés

### `Consultations` (nouvelle collection, slug `consultations`)

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `tenant` | relationship → tenants | oui | auto-assigné, readOnly, pattern `Patients.ts` |
| `patient` | relationship → patients | oui | `index: true` |
| `practitioner` | relationship → users | oui | le compte qui a réalisé l'acte (pas `doctors`, qui est la fiche vitrine publique — voir §4) |
| `date` | date | oui | défaut = maintenant |
| `motif` | text | non | texte libre, indépendant des catégories `QueueItems.visitReason` |
| `examenClinique` | textarea | non | |
| `poids` | number | non | en kg — pertinent en pédiatrie à chaque visite |
| `taille` | number | non | en cm |
| `perimetreCranien` | number | non | en cm — pertinent < 2 ans |
| `diagnostic` | textarea | non | |
| `codeActe` | text | non | **placeholder optionnel**, voir §5 |

Accès : identique à `medicalNotes` — `doctor` / `tenant_admin` / `superadmin`, tenant-scopé. `secretary` exclu (contenu clinique).

### `Prescriptions` (nouvelle collection, slug `prescriptions`)

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `tenant` | relationship → tenants | oui | auto-assigné |
| `patient` | relationship → patients | oui | `index: true` |
| `consultation` | relationship → consultations | non | nullable — une prescription peut être émise hors consultation structurée (renouvellement) |
| `practitioner` | relationship → users | oui | |
| `date` | date | oui | défaut = maintenant |
| `medications` | array | oui (≥1) | sous-champs ci-dessous |
| `notes` | textarea | non | instructions complémentaires |

Sous-champs de `medications` : `nom` (text, requis), `dci` (text, optionnel — dénomination commune internationale, utile plus tard pour tout rapprochement nomenclature), `posologie` (text, requis), `duree` (text, requis).

Accès : identique à `Consultations`.

### `Documents` (nouvelle collection, slug `documents` — **pas** un ajout à `media`)

| Champ | Type | Requis | Notes |
|---|---|---|---|
| `tenant` | relationship → tenants | oui | auto-assigné |
| `patient` | relationship → patients | oui | `index: true` |
| `consultation` | relationship → consultations | non | nullable |
| `documentType` | select | oui | `radio` / `analyse` / `certificat` / `ordonnance-externe` / `autre` |
| `file` | upload (collection propre, mimeTypes `image/*` + `application/pdf`) | oui | |
| `uploadedBy` | relationship → users | oui | auto-assigné comme `tenant`, readOnly |
| `notes` | text | non | |

Accès : identique à `Consultations`/`Prescriptions` (pas `read: () => true`, voir §3).

---

## 3. Trouvaille importante : `Media.ts` est public, `Documents` ne peut pas en hériter

`apps/cms/src/collections/Media.ts` a `read: () => true` — volontaire et correct pour son usage actuel (photos de médecin, images de la vitrine, servies sans authentification via `<img src>`). Mais ça veut dire que si on stockait les radios/bilans dans `media`, **n'importe qui avec l'URL du fichier pourrait le consulter, sans authentification**, cross-tenant compris.

D'où la collection `Documents` séparée, avec son propre `upload`, sa propre config S3 (voir §6), et un `read` restreint comme `Patients`. Aucune modification de `Media.ts` n'est nécessaire — la vitrine continue de fonctionner à l'identique.

---

## 4. `practitioner` pointe vers `users`, pas `doctors`

`Doctors` (bio publique, vitrine) et `Users` (comptes de connexion, rôles `doctor`/`secretary`/`tenant_admin`/`superadmin`) sont deux collections totalement indépendantes aujourd'hui — aucune relation entre elles. Pour "qui a réalisé cette consultation", c'est le compte connecté qui compte, donc `users`. Si un jour il faut relier un compte `users` à sa fiche publique `doctors` (ex. afficher "Dr. X" au lieu d'un email), ce sera un chantier séparé, indépendant de celui-ci.

---

## 5. Deux champs d'alignement AMO/FSE — optionnels, à valider

Ton propre `docs/Roadmap amo fse dmp.md` demande explicitement de modéliser deux choses **dès maintenant**, dans le schéma du dossier patient, même sans rien brancher derrière :

> "Modélisation de l'identifiant santé unique dès maintenant dans le schéma Payload (PracticeInfo/Patient collection), même si non branché à un système externe encore — évite une migration douloureuse plus tard"

> "Nomenclature des actes (NGAP marocaine) en base, avec code officiel par acte"

Je propose donc d'ajouter, en plus du schéma ci-dessus :
- `Patients.healthIdentifier` (text, optionnel) — "Identifiant santé unique (CNSS) — à connecter plus tard"
- `Consultations.codeActe` (text, optionnel) — déjà dans le tableau §2

Ce sont deux champs texte nullables, zéro UI supplémentaire requise (un simple input optionnel), zéro dépendance externe. Si tu préfères ne pas les inclure maintenant, dis-le et je les retire du prompt Kilo — ce n'est pas un prérequis technique de ce chantier, juste un alignement avec ce que ton roadmap demande explicitement à ce stade.

**Hors scope, volontairement pas inclus** : capture carte CNSS/OCR, génération PDF FSE, nomenclature NGAP complète, calculateur de reste à charge — tout ça reste Étape 2/3 du roadmap AMO, déclenché par la traction commerciale, pas par ce chantier.

---

## 6. Stockage des fichiers — extension de la config S3 existante

`payload.config.ts` a déjà :
```js
s3Storage({
  collections: { media: true },
  bucket: process.env.R2_BUCKET,
  config: { endpoint: process.env.R2_ENDPOINT, credentials: {...}, region: "garage", forcePathStyle: true },
})
```
Il suffit d'ajouter `documents: true` dans ce même `collections` map — même bucket Garage (`dr-tabibi-uploads`), Payload préfixe automatiquement par slug de collection. Aucune nouvelle infra à provisionner.

---

## 7. Trouvaille importante : le proxy CMS ne gère que le JSON

`apps/frontend/src/app/api/cms-proxy/[...path]/route.ts` fait `await request.json()` et force `Content-Type: application/json` sur chaque requête sortante. **L'upload de fichier (multipart/form-data) pour `Documents` ne passera pas par ce proxy tel quel** — le body serait mal interprété.

Il faut ajouter un branchement : si `request.headers.get('content-type')` commence par `multipart/form-data`, transmettre `request.body` tel quel (stream, avec `duplex: 'half'` requis par `fetch` côté Node pour un body en streaming) et copier le header `Content-Type` d'origine (boundary inclus) au lieu de le forcer en JSON. Le comportement JSON existant reste inchangé pour tous les autres appels.

---

## 8. UI frontend — `/dashboard/patients/[id]`

Sections à ajouter sur la fiche patient, sous `AddToQueueButton` / `PatientNotesForm` existants :

1. **Historique des consultations** — liste triée par date décroissante (date, motif, `practitioner`, poids/taille si renseignés). Bouton "Nouvelle consultation" → formulaire (motif, examenClinique, poids, taille, perimetreCranien, diagnostic, codeActe) → `POST /api/cms-proxy/consultations`.
2. **Ordonnances** — liste des prescriptions passées. Bouton "Nouvelle ordonnance" → formulaire avec lignes dynamiques (ajouter/retirer un médicament : nom, dci, posologie, durée) → `POST /api/cms-proxy/prescriptions`.
3. **Documents** — liste des fichiers existants (type, date, lien de téléchargement respectant l'accès CMS) + formulaire d'upload (fichier + type de document) → `POST /api/cms-proxy/documents` en `multipart/form-data`.

**Hors scope UI, à considérer plus tard si utile** : courbe de croissance visuelle (poids/taille dans le temps — naturel une fois les données présentes), génération PDF d'ordonnance, suivi vaccinal dédié.

---

## 9. Séquencement recommandé

- **Chantier A (CMS)** : les 3 collections + enregistrement config + extension S3. Migration à générer et committer avant tout.
- **Chantier B (Frontend)** : fix multipart du proxy (prérequis pour Documents) + les 3 sections UI sur `/patients/[id]`.

A doit être fait et déployé avant B (le frontend a besoin des endpoints CMS pour fonctionner).
