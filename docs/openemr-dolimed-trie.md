# dr-tabibi — Inspiration OpenEMR / DoliMed, triée
### Document de cadrage pour DeepSeek V4 Pro

Ce document trie les deux specs fournies (`spec-openemr-inspired-modules.md`,
`spec-dolimed-inspired-modules.md`) en deux parties, sur la base d'une
comparaison directe avec le code réel du repo (`dr_pediatre`, commit `20f775b`) :

- **Partie A** : la logique existante est soit absente, soit réellement moins
  bonne que le pattern OpenEMR/DoliMed — à intégrer maintenant.
- **Partie B** : logique documentée et gardée en réserve, à ressortir quand le
  besoin business se présente (pas forcément pour Dr. Guinane) — **ne pas
  prompter à V4 Flash tant que ce n'est pas explicitement demandé**.

---

## PARTIE A — À intégrer maintenant

### A.1 Courbes de croissance avec calcul de percentile réel (LMS)

**Constat vérifié dans le code** : `GrowthChart.tsx` trace aujourd'hui les
valeurs brutes de `poids`/`taille`/`perimetreCranien` (champs inline sur
`Consultations.ts`) dans le temps — **aucun calcul de percentile ou de
z-score**, pas de courbe de référence OMS/CDC en arrière-plan. C'est un
graphique de suivi, pas des courbes de croissance au sens clinique.

**À reprendre intégralement de la spec OpenEMR §1** :
- Méthode LMS (Box-Cox) : `Z = ((X/M)^L - 1)/(L*S)` si `L≠0`, sinon `ln(X/M)/S`
- Tables OMS (0–2 ans) vendorisées en JSON, tables CDC (2–20 ans) vendorisées
  en JSON — pas d'appel API externe à runtime
- Bascule automatique `length_lying` / `height_standing` selon l'âge (< ou ≥ 2 ans)
- Alerte visuelle si percentile < 3e ou > 97e, jamais de diagnostic automatique

**Décision d'architecture à trancher avec V4 Pro** : la spec propose une
collection dédiée `growth-measurements` séparée de `Consultations`. Deux options :
1. Garder les champs `poids`/`taille`/`perimetreCranien` sur `Consultations`
   (existant) et ajouter les champs de percentile calculés en `beforeChange`
   hook directement dessus — moins de refonte, mais couple la mesure de
   croissance à l'existence d'une consultation.
2. Migrer vers la collection séparée proposée par la spec — plus propre à
   terme (une mesure de croissance n'est pas toujours liée à une consultation
   complète), mais nécessite une migration de données des consultations
   existantes de Dr. Guinane.
Recommandation : **option 1 pour aller vite**, l'option 2 peut être un futur
refactor si le besoin de mesures hors-consultation apparaît.

---

### A.2 Audit log — corriger deux défauts réels, pas reconstruire

**Constat vérifié dans le code** (`apps/cms/src/hooks/logPatientAccess.ts`) :
- `logPatientReadAccess` est un hook `afterRead` qui fait
  `await payload.create(...)` **de façon bloquante sur chaque lecture** d'un
  patient — exactement le risque de performance que la spec OpenEMR §3.3
  anticipe ("écriture async/queue plutôt que bloquante sur chaque requête").
- Ce hook n'est câblé **que sur `Patients`** (`Patients.ts` est la seule
  collection qui l'importe) — pas sur `Consultations`, `Prescriptions`,
  `Vaccinations`, alors que ce sont des données tout aussi sensibles et que la
  spec recommande explicitement de les couvrir aussi.

**Ne pas recréer `AuditLogs`** — la collection existante (`AuditLogs.ts`) a
déjà l'essentiel du schéma proposé par la spec (`action`, `collectionName`,
`documentId`, `user`, `tenant`, `timestamp`) et le contrôle d'accès `read`
restreint à l'admin est probablement déjà correct — **vérifier avant de
toucher**, ne pas dupliquer.

**À corriger** :
1. Rendre l'écriture d'audit-log asynchrone / non bloquante (queue en
   mémoire + flush différé, ou `waitUntil`/tâche fire-and-forget selon ce que
   permet l'environnement Coolify — à valider avec Driss sur la faisabilité
   infra avant de choisir la mécanique exacte)
2. Étendre le câblage du hook à `Consultations`, `Prescriptions`,
   `Vaccinations` (au minimum), pas seulement `Patients`

---

### A.3 Module Vaccination — extensions ciblées, pas une reconstruction

**Constat vérifié** : `Vaccinations.ts` + `VaccineSchedule.ts` +
`vaccination-utils.ts` existent déjà et calculent correctement `overdue`/
`upcoming` par rapport à l'âge du patient — la logique métier de base
fonctionne. Ce que la spec OpenEMR §2 ajoute de réellement absent :
- Numéro de lot (`lotNumber`)
- Voie d'administration (`administrationRoute` : IM/SC/oral/intradermal)
- Statuts supplémentaires `contraindicated`/`refused` (aujourd'hui seuls
  `overdue`/`upcoming` existent, pas de notion de refus ou contre-indication
  explicite enregistrée)

**Recommandation** : ajouter ces 3 champs à `Vaccinations.ts`, sans toucher à
`VaccineSchedule.ts` ni à la logique `vaccination-utils.ts` qui fonctionne déjà.

---

### A.4 Module Correspondants (médecins référents) — nouveau, sans équivalent

**Constat vérifié** : aucune collection équivalente n'existe dans le repo.

**À reprendre intégralement de la spec DoliMed §1** — schéma
`ReferringPractitioner` + relation `hasMany` sur `Patients`, vue statistique
"qui me réfère le plus de patients". Faible risque, forte valeur, aucun
conflit avec l'existant.

---

## PARTIE B — Gardé en réserve (ne pas prompter maintenant)

Ce module reste documenté ici pour être ressorti tel quel le jour où un
besoin business explicite apparaît (pas nécessairement Dr. Guinane —
potentiellement un futur client généraliste/spécialiste, ou Dr. Guinane
elle-même si sa position sur la facturation change).

### B.1 Facturation / encaissement par consultation (spec DoliMed §2, §3)

Logique à garder telle quelle en réserve :
- `Consultations.payment` (group : `amountCard`, `amountCheque`, `amountCash`,
  `amountOther`, `chequeBankName` conditionnel, `totalAmount` calculé)
- Verrouillage temporel post-encaissement (`consultationLockDelayDays` par
  tenant, hook `beforeChange` qui bloque la modification passé le délai sauf
  pour `admin`)
- Dashboard statistiques de revenus (agrégation mensuelle/annuelle, export
  CSV/XLSX, accès restreint à `admin`/médecin titulaire — jamais secrétaire
  par défaut)
- Dictionnaire configurable de motifs/diagnostics/examens
  (`consultation-reason-dictionary`)

**Pourquoi c'est en réserve et pas en cours** : Dr. Guinane a explicitement
indiqué que la facturation n'est pas indispensable pour le tier `dossier` —
d'où le renommage de la page stats en "Activité" plutôt que "Comptabilité".
Ce module devient pertinent le jour où un client (futur ou Dr. Guinane
elle-même) exprime concrètement ce besoin — probablement un signal à
surveiller côté tier `clinique` ou généraliste plutôt que pédiatrie solo.

### A.5 Accès patient scopé par médecin ("followed by") + partage explicite entre médecins du cabinet

**Décision produit actée** : dans un cabinet `clinique` (multi-médecins), un
médecin ne voit par défaut **que ses propres patients** — pas ceux de ses
associés. Un mécanisme de partage explicite permet de donner l'accès à un
patient précis à un autre médecin du même cabinet quand c'est nécessaire
(remplacement, avis, suivi croisé).

**Constat vérifié, rappel** : `Patients.ts` scope aujourd'hui l'accès par
tenant + rôle uniquement. `QueueItems.doctor` (tier clinique) ne résout que
l'affichage de la file d'attente, pas la confidentialité des dossiers. Ce
schéma comble ce trou.

**Schéma Payload** :
```ts
// Sur collections/Patients.ts, ajouter :
{
  name: 'followedBy',
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  defaultValue: ({ user }) => [user?.id], // le médecin créateur par défaut
},
{
  name: 'sharedWith',
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  admin: { description: 'Médecins du cabinet ayant reçu un accès ponctuel à ce dossier' },
},
```

**Access control** :
```ts
access: {
  read: ({ req }) => {
    const roles = req.user?.roles ?? []
    if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
    if (!roles.includes('doctor')) return true // secretary/autres rôles : logique de tenant existante inchangée
    return {
      tenant: { equals: req.user?.tenant },
      or: [
        { followedBy: { in: [req.user?.id] } },
        { sharedWith: { in: [req.user?.id] } },
      ],
    }
  },
}
```

**Point d'attention important** : cette restriction ne doit s'appliquer
**que pour le rôle `doctor` en tier `clinique`**. Pour le tier `dossier`
(médecin solo, cas Dr. Guinane), il n'y a qu'un seul médecin donc aucun
changement de comportement ne doit être visible — `followedBy` contiendra
systématiquement l'unique médecin du cabinet, et le filtre est un no-op.
Ne pas casser le comportement actuel de Dr. Guinane en déployant ce
chantier.

**UI à prévoir** :
- Sur la fiche patient : un bouton "Partager avec un confrère" (visible
  seulement en tier `clinique`, pour le rôle `doctor`) → sélection d'un
  médecin du même tenant → ajout à `sharedWith`
- Un indicateur visuel sur la fiche patient si elle est partagée (et avec
  qui), pour que le médecin d'origine sache qui d'autre a accès
- Un moyen de retirer le partage (pas seulement l'accorder) — sinon les accès
  s'accumulent sans jamais être révoqués
- `tenant_admin` garde un accès total à tous les patients du cabinet
  (supervision), cohérent avec son rôle actuel sur `audit-logs`

**Dépendance** : nécessite que le lien `Doctors`↔`Users` (déjà en place
depuis `80c9eed`) soit fiable pour peupler la liste des "confrères du même
cabinet" dans le sélecteur de partage.

---

---

## Ordre suggéré pour la Partie A

1. **A.2 (audit log)** en premier — corrige un risque de perf déjà en
   production et un gap de couverture sécurité, faible effort
2. **A.4 (correspondants)** — simple, aucune dépendance, gain rapide
3. **A.3 (vaccination, champs additionnels)** — simple extension de schéma
4. **A.5 (accès patient scopé par médecin + partage)** — dépend du lien
   `Doctors`↔`Users` déjà en place ; à traiter avant le tier `clinique` de
   se généraliser à un vrai deuxième cabinet, pour éviter que des dossiers
   circulent sans confidentialité entre-temps
5. **A.1 (growth charts LMS)** — le plus gros morceau, mais le plus haute
   valeur produit ; à cadrer en dernier car demande le plus de travail
   (vendorisation des tables OMS/CDC, fonction de calcul, UI de courbes)
