# dr-tabibi — Backlog post-MVP priorisé

### Document de cadrage pour DeepSeek V4 Pro (découpage en prompts d'exécution pour V4 Flash)

**Repo :** `github.com/drixouuk/dr_pediatre` (pnpm monorepo — `apps/cms` Payload CMS v3, `apps/frontend` Next.js 16)
**Statut au moment de la rédaction :** dernier commit `2862faf`. Dashboard refait, carnet vaccinal, courbes de croissance, export/import CSV, recherche patient, onboarding self-service, intégration Cal.com par webhooks — tous livrés. Ce document couvre ce qui **reste** à faire, hors responsive/PWA (traité séparément, en cours).

**Rôle de ce document :** ce n'est pas un ensemble de prompts prêts à exécuter. C'est le contexte produit et technique dont V4 Pro a besoin pour découper chaque chantier en lots exécutables par V4 Flash, dans le bon ordre, avec les bonnes garde-fous. Chaque chantier ci-dessous liste : l'objectif, le contexte technique actuel du repo (vérifié en clonant le repo, pas supposé), les dépendances, ce qui est explicitement hors scope, et les points d'attention.

**Règle de fonctionnement à rappeler à V4 Pro** : aucun changement sur `apps/cms/src/collections/` sans migration Payload (`npx payload migrate:create` → revue du SQL → commit du `.ts` + snapshot `.json` immédiatement, le filesystem du conteneur est éphémère). Un hook Husky pre-commit et une règle dans `.kilocode/rules.md` l'imposent déjà — ne pas le redécouvrir à chaque fois.

---

## Contexte technique transversal (vérifié dans le repo)

- **Multi-tenancy** : quasi toutes les collections (`Doctors`, `Patients`, `QueueItems`, etc.) ont un champ `tenant` (relationship vers `tenants`) rempli automatiquement en `beforeChange` depuis `req.user.tenant`, et un access control qui filtre par `tenant.equals`. Tout nouveau chantier touchant à une collection doit répliquer ce pattern exactement (voir `Doctors.ts`, `Patients.ts`, `QueueItems.ts` comme référence).
- **Tier du tenant** : stocké dans `tenant.settings.activeTier` (pas un champ top-level), valeurs actuelles `vitrine | rdv | dossier | clinique`. Vérifié dans `(dashboard)/layout.tsx`.
- **`Doctors` collection** : a un champ `specialty` (texte libre aujourd'hui) et un champ `tenant`, mais **aucun lien vers `Users`** — confirmé dans `Doctors.ts`. C'est la racine du chantier #2 ci-dessous.
- **`QueueItems` collection** : a un champ `tenant` mais **aucun champ `doctor`/praticien** — confirmé dans `QueueItems.ts`. C'est la racine du chantier #3.
- **Collections cliniques existantes** : `Patients`, `Consultations`, `Prescriptions`, `Vaccinations`, `VaccineSchedule`, `Documents` — toutes actuellement neutres en spécialité SAUF `Vaccinations`/`VaccineSchedule` qui sont pédiatrie-only par construction (référentiel PNI marocain), et le composant courbes de croissance sur la fiche patient qui est câblé en dur.

---

## PRIORITÉ 1 — Bloquant pour vendre à un 2ᵉ client / une autre spécialité

### 1. Dossier générique par spécialité (choix à l'onboarding)

**Objectif** : permettre à un futur tenant non-pédiatre (généraliste, gynécologue, etc.) d'avoir un dossier patient pertinent pour sa spécialité, sans que dr-tabibi reste un logiciel pédiatrie-only.

**Pourquoi c'est en premier** : c'est un chantier d'architecture. Les chantiers #7, #10, #12 en dépendent directement. Le faire après eux impose de tout reconstruire.

**Contexte technique actuel** :

- `Doctors.specialty` existe déjà mais en texte libre, non structurant pour le reste du produit
- Aucun concept de "modules cliniques conditionnels" n'existe : le carnet vaccinal et les courbes de croissance sont des composants toujours affichés sur la fiche patient, pas conditionnés par la spécialité du tenant
- Le flux d'onboarding self-service existe déjà (`110aa9c`) pour vitrine/rdv — c'est le point d'entrée naturel pour ajouter le choix de spécialité

**Découpage suggéré pour V4 Pro** :

1. Ajouter un champ `specialty` structuré (select, pas texte libre) sur `Tenants` (ou dans `tenant.settings`, à choisir en cohérence avec l'existant), avec au minimum les valeurs `pediatrie` / `generaliste` / `autre` pour démarrer — pas besoin d'exhaustivité dès le lot 1
2. Ajouter le choix de spécialité dans le flux d'onboarding self-service dossier/clinique
3. Conditionner l'affichage des modules `Vaccinations`/`VaccineSchedule` et du composant courbes de croissance à `specialty === 'pediatrie'` (ne pas les supprimer, juste les masquer/désactiver pour les autres spécialités)
4. Définir le socle commun de champs cliniques (antécédents, allergies, traitements en cours) qui doit exister quelle que soit la spécialité — probablement déjà partiellement présent dans `Consultations`/`Patients`, à auditer avant d'ajouter

**Hors scope explicite** : ne pas construire de formulaire de consultation personnalisable librement par le médecin (voir chantier #18, différent et plus tardif). Ici on parle de modules prédéfinis conditionnés par spécialité, pas de configuration libre.

**Point d'attention clinique** : si de nouveaux champs cliniques structurés sont ajoutés pour d'autres spécialités, ne jamais introduire de logique de calcul/seuil clinique (posologie, alertes diagnostiques) sans validation explicite par un praticien de cette spécialité — même principe que la décision déjà prise d'écarter la validation automatique de dose.

---

### 2. Lien `Doctors` ↔ `Users`

**Objectif** : relier chaque compte utilisateur médecin à sa fiche `Doctors`, pour permettre "consultation par Dr. X", des permissions par praticien, et servir de fondation au tier `clinique`.

**Contexte technique actuel** : `Doctors` et `Users` sont deux collections indépendantes aujourd'hui, reliées uniquement par `tenant` (donc plusieurs médecins du même tenant sont indistincts entre eux au niveau utilisateur).

**Découpage suggéré** :

1. Ajouter un champ `relationship` bidirectionnel `Users.doctorProfile` ↔ `Doctors.user` (un seul sens suffit techniquement en Payload avec une jointure inverse en query, mais vérifier ce qui est le plus simple à maintenir avec l'existant)
2. Migration de données pour les comptes déjà existants (Dr. Guinane a un compte user ET une fiche doctor — les lier)
3. Adapter les vues qui affichent une consultation/prescription pour pouvoir référencer et afficher le médecin traitant

**Dépendance** : aucune en amont, mais bloque le #3.

---

### 3. Tier `clinique` réel (multi-médecins, files séparées)

**Objectif** : permettre à un cabinet de groupe (plusieurs médecins) d'avoir chacun sa propre file d'attente / son propre agenda, au lieu d'une file unique par tenant.

**Dépendance stricte** : nécessite le #2 fait et stable avant de commencer.

**Contexte technique actuel** : `QueueItems` n'a aucun champ `doctor` — la file est aujourd'hui une ressource unique par tenant, ce qui correspond au tier `dossier` (médecin solo) mais pas à `clinique`.

**Découpage suggéré** :

1. Ajouter un champ `doctor` (relationship) sur `QueueItems`, optionnel dans un premier temps pour ne pas casser les tenants `dossier` existants (Dr. Guinane) où ce champ resterait vide/single-doctor implicite
2. Filtrer la vue file d'attente par médecin sélectionné si `tier === 'clinique'`
3. Adapter Cal.com côté agenda si plusieurs event-types/comptes existent déjà par médecin (à vérifier côté config Cal.com, pas juste côté code)
4. Adapter les stats de la page Activité pour permettre un filtre par médecin quand `tier === 'clinique'`

**Point d'attention** : ne pas casser le comportement actuel du tier `dossier` en ajoutant cette notion — le champ `doctor` doit être optionnel/rétrocompatible.

---

## PRIORITÉ 2 — Frictions client concrètes, indépendantes du multi-spécialité

Ces chantiers peuvent démarrer en parallèle du responsive/PWA en cours, sans attendre la Priorité 1.

### 4. Modèles de consultation/ordonnance réutilisables

Templates enregistrables par le médecin (texte pré-rempli fréquent) réutilisables à la volée lors de la création d'une consultation/prescription. Probablement une nouvelle collection `Templates` ou `ConsultationTemplates`, filtrée par tenant, avec insertion en un clic dans le formulaire existant.

### 5. PDF ordonnance/certificat

Génération PDF téléchargeable/imprimable depuis une consultation ou prescription existante. Vérifier d'abord s'il existe déjà un mécanisme d'impression basique avant de choisir la librairie PDF (`@react-pdf/renderer` ou équivalent compatible Next.js 16).

### 6. Export ordonnance/documents vers WhatsApp en un clic

Bouton générant un lien `wa.me` ou `whatsapp://send` pré-rempli avec le PDF (ou son lien de téléchargement) pour partage direct au patient — canal de communication de facto au Maroc. Dépend du #5 si on veut partager un PDF plutôt qu'un texte.

### 7. Base de médicaments avec autocomplete (sans validation de dose)

Autocomplete du nom de molécule/médicament dans le champ prescription — uniquement le nom, aucune logique de seuil ou de dose. Nécessite une source de données (référentiel médicaments marocain ou liste manuelle validée par Dr. Guinane, pas générée par un agent de code — même principe de prudence que pour le carnet vaccinal PNI).

### 8. Statistiques d'occupation de la file d'attente

Extension de la page Activité déjà existante (`recharts` déjà en place) : temps d'attente moyen, répartition par heure/jour. Réutiliser l'infrastructure de graphiques déjà construite pour Activité plutôt que d'en recréer une.

### 9. Recherche/filtre sur l'historique de consultations

Extension de la recherche patient déjà livrée (`03a0ad0`) vers l'historique de consultations lui-même (par date, par mot-clé de motif de consultation).

---

## PRIORITÉ 3 — Clinique enrichi, dépend du #1

Ne pas démarrer ces chantiers avant que le #1 soit cadré, sinon risque de reconstruction.

### 10. Champs cliniques enrichis

Champs spécifiques par spécialité venant se greffer sur le socle commun défini au #1.

### 11. Codage CIM-10

Utile pour stats/facturation/interop AMO plus tard. Peu de valeur immédiate tant que #15 (facturation) n'est pas actif — à ne pas prioriser avant d'avoir un signal clair de besoin (client ou AMO).

### 12. Lien fratrie

Rattachement de dossiers d'enfants d'une même famille — spécifique pédiatrie, cohérent avec le fait que ce n'est pas généralisable aux autres spécialités traitées au #1.

### 13. Rôle "remplaçant" temporaire à accès limité

Nouveau rôle utilisateur avec expiration automatique de l'accès (date de fin), distinct du rôle `secretary` actuel. Fréquent au Maroc (médecin en congés). Nécessite un mécanisme d'expiration de compte (cron ou vérification à la connexion) qui n'existe probablement pas encore dans `Users`.

---

## PRIORITÉ 4 — Plus loin, dépend d'usage réel ou de choix produit lourds

Ne pas prompter ces chantiers sans validation explicite de Driss au moment venu — ils dépendent d'un signal business ou clinique qui n'existe pas encore.

### 14. Rappels SMS

Configuration Cal.com Workflows — pas du code applicatif. À activer côté config quand le besoin est confirmé.

### 15. Facturation/encaissement

Explicitement pas indispensable pour le tier `dossier` selon Dr. Guinane. Redevient pertinent seulement avec un futur client généraliste/spécialiste qui en exprime le besoin.

### 16. Sauvegarde/export périodique automatique des données du tenant

Argument commercial anti-lock-in, pas bloquant pour l'usage actuel. Mécanisme d'export programmé (cron + stockage Garage) à cadrer le jour où c'est priorisé.

### 17. Portail patient OTP

Gros chantier d'authentification patient et d'exposition de données médicales côté patient. Ne pas démarrer sans demande explicite d'un client.

### 18. Formulaire de consultation personnalisable par spécialité

Configuration libre par le médecin lui-même (au-delà des templates prédéfinis du #1). À ne considérer qu'après que le #1 tourne en production sur au moins 2 spécialités différentes.

### 19. Téléconsultation

Ne pas construire sans confirmation explicite du besoin par un praticien (Dr. Guinane ou futur client).

### 20. App native (Android/iOS)

En pause jusqu'à fondations terminées et usage réel avéré par de vrais clients — décision déjà actée en session.

---

## Note pour V4 Pro sur le séquencement global

L'ordre recommandé de démarrage, une fois responsive/PWA terminé :

1. **#1 seul d'abord**, cadrage architecture avant tout code — c'est un prérequis conceptuel pour #7, #10, #12, #18
2. **#2 puis #3** en séquence stricte (dépendance directe)
3. **Priorité 2 (#4 à #9)** peut être menée en parallèle des points 1-2 ci-dessus, aucune dépendance croisée
4. **Priorité 3** seulement après que #1 soit stable
5. **Priorité 4** au cas par cas, sur signal business/clinique explicite — ne pas les prompter de manière proactive

Comme toujours dans ce projet : Driss valide le périmètre de chaque lot avant que les prompts d'exécution soient écrits pour V4 Flash, et les commits sont vérifiés après coup par audit de code, pas sur la seule base du résumé de l'agent.
