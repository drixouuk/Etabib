# dr-tabibi — Audit UX complet, findings consolidés

### Réalisé par inspection directe du code, commit `20f775b` (branche `main`)

Méthode : inspection ligne à ligne des composants réels de chaque flux (espace praticien, onboarding, vitrine publique), pas de suppositions génériques. Chaque finding cite le fichier et le comportement exact observé.

---

## Résumé exécutif — tous findings, classés par priorité de traitement

| #   | Finding                                                                                                     | Sévérité     | Fréquence / contexte                | Écran                                                     |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------- | --------------------------------------------------------- |
| 1   | Formulaire de contact **cassé sur le site vitrine public en production** — aucune donnée envoyée nulle part | **Critique** | Impact client réel, dès aujourd'hui | Vitrine publique (`ContactForm`)                          |
| 2   | Autocomplete médicaments pré-remplit la **posologie** depuis un autre patient, sans avertissement           | **Critique** | À chaque prescription               | Fiche patient — Ordonnances                               |
| 3   | Onboarding "Nous contacter" (dossier/clinique) : **aucune donnée collectée**                                | **Critique** | À chaque prospect payant            | Onboarding                                                |
| 4   | Sélecteur de spécialité à l'onboarding : **inaccessible en pratique** (bug de séquencement)                 | **Critique** | Casse le chantier #1 du backlog     | Onboarding                                                |
| 5   | Échec de sauvegarde **silencieux** sur la plupart des formulaires cliniques                                 | **Critique** | Rare mais grave quand ça arrive     | Consultations, Prescriptions, Dossier clinique, Documents |
| 6   | Confirmation de suppression patient générique, sans nom ni mention de perte de l'historique                 | **Critique** | Rare mais irréversible              | Fiche patient                                             |
| 7   | Indicateur d'étape trompeur pour le flux dossier/clinique                                                   | Modéré       | Dépend du #3/#4                     | Onboarding                                                |
| 8   | "Terminer" une consultation en file d'attente : un clic, aucune confirmation, liste qui se rafraîchit seule | Modéré       | Quotidien                           | File d'attente en direct                                  |
| 9   | Modale `prompt()` navigateur pour nommer un modèle                                                          | Modéré       | Fréquent                            | Consultations, Ordonnances                                |
| 10  | Page Activité : grille de stats non responsive (`grid-cols-3` fixe)                                         | Modéré       | Usage mobile                        | Activité                                                  |
| 11  | Accès "remplaçant" : expiration peu visible, pas d'alerte proactive                                         | Modéré       | Ponctuel mais à risque              | Sidebar                                                   |
| 12  | Lien "Voir le tableau de bord" mal routé vers `/dashboard` au lieu de `/dashboard/queue`                    | Mineur       | Quotidien                           | Ajout à la file d'attente                                 |
| 13  | Tier du cabinet affiché en jargon brut (`dossier`, `clinique`)                                              | Mineur       | Toujours visible                    | Sidebar                                                   |
| 14  | En-tête fiche patient : identité + coordonnées mélangées sur une ligne dense                                | Mineur       | Quotidien                           | Fiche patient                                             |

---

## 1. Formulaire de contact cassé sur le site vitrine public (Critique — impact production immédiat)

**Fichiers** : `apps/frontend/src/components/ui/ContactForm.tsx`, utilisé dans `apps/frontend/src/components/sections/InfosSection.tsx`, inclus sur la page d'accueil publique (`apps/frontend/src/app/[locale]/page.tsx`)

Le formulaire de contact affiché sur le site public de Dr. Guinane (section infos de la page d'accueil) a les champs `name`/`phone`/`message` **non contrôlés** (pas de `value`/`onChange`, pas de `ref`, pas de lecture `FormData`), et `handleSubmit` se limite à :

```js
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  setSent(true);
};
```

Aucun appel réseau n'existe, même raté. L'utilisateur remplit le formulaire, clique "Envoyer", voit un message de succès — **et rien n'est envoyé ni stocké nulle part**. C'est le finding le plus urgent de tout l'audit : contrairement aux autres, celui-ci touche une utilisatrice payante en production dès aujourd'hui, pas un scénario futur ou un prospect.

**Recommandation** : brancher un vrai envoi (email vers le cabinet, et/ou entrée CMS type `ContactMessages`) avant d'afficher la confirmation de succès.

---

## 2. Autocomplete médicaments — risque clinique réel (Critique)

**Fichier** : `apps/frontend/src/app/api/medications/autocomplete/route.ts`

La suggestion de médicament interroge **toutes les prescriptions du cabinet, tous patients confondus** (`/api/prescriptions?depth=0&limit=500&sort=-date`), regroupe par nom de médicament, et pré-remplit `posologie` et `duree` avec les valeurs de la prescription **la plus récente trouvée pour ce nom** — peu importe l'âge, le poids ou la pathologie du patient concerné par cette ancienne prescription.

C'est exactement le risque que la décision de session avait explicitement écarté ("sécurité posologique volontairement écartée... ne jamais construire ça sans cadrage clinique"). Le contournement est involontaire : l'autocomplete a été pensé comme confort de saisie du nom, mais propose aussi une dose en un clic, sans indication de provenance. En pédiatrie, où la dose dépend du poids, c'est un vrai risque qu'un médecin pressé accepte une posologie inadaptée à l'enfant en face de lui.

**Recommandation** : ne suggérer que le nom + DCI (jamais la posologie/durée pré-remplie automatiquement), ou afficher un avertissement explicite ("dose issue d'un autre dossier — à vérifier") au moment du clic.

---

## 3. Onboarding "Nous contacter" — aucune capture de lead (Critique, impact business direct)

**Fichier** : `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`, lignes 207-229

Quand un visiteur clique "Nous contacter" pour les tiers `dossier` ou `clinique`, le flux saute directement à un écran de remerciement statique. **Aucun formulaire n'est affiché** : pas de nom, téléphone, email. Le composant `ContactForm.tsx` existant dans le repo n'est même pas appelé ici.

**Conséquence** : un praticien intéressé par un tier payant — la cible commerciale prioritaire — clique, voit "merci, on vous recontacte", et ferme l'onglet sans que Driss reçoive quoi que ce soit. Aucune notification, aucune entrée en base.

**Recommandation** : brancher un vrai formulaire (nom, téléphone, email) avant l'écran de confirmation, avec envoi effectif avant d'afficher "Demande envoyée".

---

## 4. Sélecteur de spécialité à l'onboarding — inaccessible en pratique (Critique)

**Fichier** : `OnboardingFlow.tsx`, `handleTierClick` (lignes 79-86) et bloc du sélecteur (lignes 127-142)

```js
const handleTierClick = (slug: string) => {
  setSelectedTier(slug)
  if (slug === 'dossier' || slug === 'clinique') {
    setStep(2)   // saute directement à la confirmation
  } else {
    setStep(1)
  }
}
```

Le sélecteur de spécialité n'est rendu que si `step === 0` et `selectedTier` vaut `dossier`/`clinique`. Mais dès le clic sur la carte, `step` passe à `2` dans le même batch de mise à jour React — l'utilisateur ne voit donc **jamais** ce sélecteur. La spécialité reste systématiquement à sa valeur par défaut `'generaliste'` (`useState('generaliste')`), quel que soit ce que le praticien voulait choisir.

C'est précisément le chantier #1 du backlog (dossier générique par spécialité) — livré côté backend (`api/onboarding/route.ts` accepte bien `specialty`), mais **inaccessible côté interface**. Tout tenant créé via ce flux serait enregistré `generaliste`, y compris un futur pédiatre, masquant par erreur ses modules vaccination/courbes de croissance.

**Recommandation** : insérer une étape dédiée à la spécialité (ou l'afficher avant de changer de step), plutôt que de la conditionner à un `step` qui n'existe déjà plus au moment du clic.

---

## 5. Échec de sauvegarde silencieux — pattern systémique (Critique)

**Fichiers** : `ConsultationForm.tsx`, `PrescriptionForm.tsx`, `PatientClinicalFields.tsx`, `DocumentUpload.tsx`

Les quatre suivent le même schéma :

```js
if (res.ok) {
  /* succès, fermeture du formulaire */
}
setSaving(false);
```

Aucun `else` n'affiche d'erreur. Si l'API répond en erreur (session expirée, champ invalide, coupure réseau), le bouton redevient simplement cliquable, sans aucun message — un médecin peut croire que la consultation ou l'ordonnance a été enregistrée alors que rien n'a été sauvegardé, silencieusement, sur une donnée clinique.

**Contre-exemple positif dans le même repo** : `AddToQueueButton.tsx` et `PatientDeleteButton.tsx` gèrent bien ce cas — preuve que ce n'est pas un choix assumé mais une incohérence entre lots de code.

**Recommandation** : ajouter la gestion d'erreur manquante aux 4 formulaires, en reprenant le pattern déjà correct des deux autres composants.

---

## 6. Suppression de patient — confirmation insuffisante pour l'enjeu (Critique)

**Fichier** : `PatientDeleteButton.tsx`

Le composant reçoit une prop `patientName` — **jamais affichée**. L'étape de confirmation dit simplement "Confirmer ?" / "Annuler", sans rappeler quel patient est concerné, ni mentionner la perte de l'historique clinique associé (consultations, prescriptions, vaccinations, documents).

**Recommandation** : afficher le nom du patient dans le texte de confirmation ("Supprimer définitivement le dossier de {patientName} ?") et mentionner la perte de l'historique si c'est effectivement le cas côté données.

---

## 7. Indicateur d'étape trompeur pour dossier/clinique (Modéré)

**Fichier** : `StepIndicator.tsx`, combiné au comportement du #3/#4

Puisque le flux dossier/clinique saute directement de `step 0` à `step 2`, l'indicateur visuel affiche les 3 étapes comme complétées/actives alors que l'étape "Inscription" n'a jamais eu lieu. Probablement résolu de lui-même une fois #3/#4 corrigés.

**Recommandation** : adapter dynamiquement le nombre d'étapes affichées selon le tier, ou traiter après correction du #3/#4.

---

## 8. "Terminer" une consultation — un clic, aucune confirmation, en contexte mobile (Modéré)

**Fichier** : `WaitingRoomList.tsx`

Le bouton "Terminer" (`in_consultation` → `completed`) agit sans confirmation. Une confirmation systématique serait trop lourde pour une action quotidienne fréquente, mais deux éléments aggravent le risque : la liste se rafraîchit automatiquement toutes les 15 secondes (`setInterval(fetchQueue, 15000)`), pouvant réordonner la liste pendant qu'un utilisateur vise un bouton — notamment sur petit écran tactile — et aucun "annuler" n'existe après coup.

**Recommandation** : envisager un léger délai visuel après clic ("Patient terminé — Annuler", 3-5 secondes) plutôt qu'une confirmation bloquante.

---

## 9. `prompt()` navigateur pour nommer un modèle (Modéré)

**Fichiers** : `ConsultationForm.tsx`, `PrescriptionForm.tsx` — fonction `saveAsTemplate`

```js
const name = prompt("Nom du modèle :");
```

Casse la cohérence visuelle du design system (teal/amber/cream, Figtree/Noto Sans) et bloque le thread JS. Apparaît à chaque sauvegarde de modèle.

**Recommandation** : remplacer par une modale ou un champ inline cohérent avec le design system.

---

## 10. Page Activité — grille de stats non responsive (Modéré)

**Fichier** : `ActivityView.tsx`, ligne 57

```jsx
<div className="mb-6 grid grid-cols-3 gap-4">
```

Contrairement à d'autres grilles du produit (`TierCard` en onboarding : `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`), cette grille de 3 cartes de stats n'a aucune classe de breakpoint. Le lot responsive global est bien réel (`DashboardShell.tsx` gère correctement la sidebar en mode hamburger sous `md`), mais ce composant précis semble être passé au travers de la passe responsive.

**Recommandation** : ajouter `grid-cols-1 sm:grid-cols-3`, cohérent avec le pattern déjà utilisé ailleurs.

---

## 11. Rôle "remplaçant" — expiration peu visible (Modéré)

**Fichier** : `Sidebar.tsx`, lignes 73-75

L'information d'expiration est présente mais affichée en petit texte dans le pied de sidebar, sans alerte proactive à l'approche de l'expiration. Pour un remplaçant en pleine journée de consultations, découvrir la déconnexion au moment où l'accès expire est une vraie friction opérationnelle.

**Recommandation** : ajouter une alerte visible (bannière ou toast) quand l'expiration approche (ex: moins de 2h restantes).

---

## 12. Lien "Voir le tableau de bord" mal routé (Mineur)

**Fichier** : `AddToQueueButton.tsx`, ligne 57

```jsx
Patient ajouté à la file d'attente. <Link href="/dashboard">Voir le tableau de bord</Link>
```

Pointe vers `/dashboard` (Vue d'ensemble) au lieu de `/dashboard/queue` — résidu de la refonte dashboard.

**Recommandation** : pointer vers `/dashboard/queue`.

---

## 13. Tier du cabinet affiché en jargon interne (Mineur)

**Fichier** : `Sidebar.tsx`, ligne 62

```jsx
{
  tenant && <p>{tenant.settings?.activeTier || ""}</p>;
}
```

Affiche littéralement `dossier` ou `clinique` — terme de nomenclature interne, pas un libellé pensé pour l'utilisateur. `roleLabels` fait déjà ce travail de traduction juste en dessous dans le même fichier pour les rôles.

**Recommandation** : mapper vers un libellé utilisateur ("Cabinet individuel" / "Cabinet de groupe"), même logique que `roleLabels`.

---

## 14. En-tête fiche patient — densité d'information sans hiérarchie (Mineur)

**Fichier** : `patients/[id]/page.tsx`, lignes 160-174

CIN, date de naissance, âge, adresse, téléphone, email, date de création sont tous rendus en ligne, libellés incohérents en style ("CIN :", "Né(e) le", "Adresse :"). Plus lent à parcourir qu'une hiérarchie visuelle claire identité vs contact, en usage répété plusieurs fois par consultation.

**Recommandation** : séparer visuellement identité (nom, âge, CIN) des coordonnées (adresse, tél, email).

---

## Points positifs observés (à ne pas casser en corrigeant le reste)

- `AddToQueueButton.tsx` et `PatientDeleteButton.tsx` gèrent correctement les erreurs et donnent un retour explicite — bon pattern de référence pour corriger le #5.
- `PatientClinicalFields.tsx` affiche une confirmation "Enregistré ✓" après sauvegarde réussie.
- Masquage cohérent des sections cliniques pour `secretary` : message explicite ("Dossier clinique — accès restreint aux médecins") plutôt qu'un vide énigmatique.
- Filtres de recherche (consultations, prescriptions) avec bouton "Effacer" contextuel, cohérent d'un composant à l'autre.
- Vue "Année" de la page Activité : vérifié dans `activity/page.tsx`, l'agrégation par mois est bien faite (pas de surcharge de l'axe X) — point initialement soupçonné, confirmé non problématique.

---

## Ce qui n'a pas pu être vérifié dans cet audit

- Comportement exact de la suppression en cascade d'un patient côté collections Payload (pour confirmer la gravité réelle du #6)
- Test visuel réel en device mobile (le code responsive existe mais seule une lecture de code a été faite, pas un test visuel)
- Vue Activité au-delà des points relevés (ex: comportement des filtres de période sur mobile)

---

## Suite logique

Les findings #1 à #6 (tous critiques) sont candidats à un traitement immédiat, dans cet ordre suggéré : #1 (impact production immédiat sur client payant) → #4 (casse un chantier déjà considéré comme livré) → #3 → #2 (risque clinique, moins fréquent mais grave) → #5 → #6. Les findings #7 à #14 peuvent être groupés dans un ou plusieurs lots suivants, à cadrer avec Driss avant l'écriture des prompts d'exécution pour Kilo Code / V4 Flash.
