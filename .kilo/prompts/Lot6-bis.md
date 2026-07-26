# Prompt Kilo Code — Alignement fidèle sur la maquette `dr-tabibi-refonte-2026.html`

## Contexte

La maquette HTML (`dr-tabibi-refonte-2026.html`) est la **référence visuelle exacte**. L'implémentation actuelle est déjà structurellement proche (bravo — sidebar, stat cards, tabs, drawer consultation/ordonnance sont bien en place), mais plusieurs détails de style et de données s'écartent de la maquette. Ce prompt liste **uniquement les écarts confirmés**, fichier par fichier. Ne touche à rien d'autre.

**Décisions déjà tranchées (ne pas revenir dessus) :**

- L'app reste en plein écran (edge-to-edge). Ne PAS reproduire la carte flottante centrée 1400px de la maquette.
- Le dark mode / toggle "Mode sombre" est hors scope pour ce lot. Ne pas l'ajouter.

---

## 0. BUG CONFIRMÉ (priorité haute) — `PatientAvatar.tsx` n'affiche jamais la couleur de genre

**Root cause identifiée dans le code**, confirmée par un cas réel (patient "Rania Idrissi", `gender: "girl"` en base, avatar gris à l'écran) :

Dans `apps/frontend/src/components/dashboard/PatientAvatar.tsx`, la couleur de genre (`bg-avatar-girl` / `bg-avatar-boy`) est appliquée sur le conteneur `<Avatar>`. Mais dans `apps/frontend/src/components/ui/avatar.tsx`, l'enfant `<AvatarFallback>` a sa propre classe par défaut `bg-muted` et occupe `size-full` — il se dessine donc **par-dessus** le parent et masque totalement sa couleur de fond. Résultat : la couleur de genre n'apparaît jamais, quel que soit le patient, partout où `PatientAvatar` est utilisé (liste patients `PatientTable.tsx`, vue d'ensemble `QueuePreview.tsx`, détail patient).

Seul `components/dashboard/WaitingRoomList.tsx` (page File d'attente complète) échappe au bug : il n'utilise pas `PatientAvatar`/shadcn `Avatar`, mais un `<div>` custom avec la couleur appliquée directement dessus — d'où l'incohérence visuelle entre les deux vues alors que la donnée `gender` est identique.

**Fix — `apps/frontend/src/components/dashboard/PatientAvatar.tsx` :**

Retirer le `bg-muted` de l'`AvatarFallback` pour ce composant en passant une classe qui neutralise le défaut, par exemple :

```tsx
<Avatar className={`${SIZE_CLASSES[size]} ${bgColor} ${className}`}>
  <AvatarFallback className="bg-transparent text-white font-bold">
    {getInitials(fullName)}
  </AvatarFallback>
</Avatar>
```

Vérifier après coup que `bg-transparent` a bien priorité sur `bg-muted` dans la fusion de classes (le composant `ui/avatar.tsx` utilise `cn(...)` qui merge via `tailwind-merge` normalement — `bg-transparent` passé en dernier doit gagner). Si `cn()` ne résout pas le conflit correctement, passer plutôt par une prop `style={{ backgroundColor: 'transparent' }}` en dernier recours, mais la classe devrait suffire.

**Ne pas toucher** à `WaitingRoomList.tsx` — son implémentation custom fonctionne déjà correctement et n'est pas concernée par ce bug.

**Vérification après fix :** recharger la liste patients, la vue d'ensemble, et le détail patient pour "Rania Idrissi" (CIN BK246802, gender: girl) — l'avatar doit apparaître en rose (`--color-avatar-girl: #C97B85`) partout, pas seulement dans la file d'attente.

---

## 0bis. Style des tabs du dossier patient — `app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

**Écart confirmé :** la maquette a un soulignement teal fin (2.5px) qui glisse sous l'onglet actif, texte teal-dark gras pour l'onglet actif, fond transparent, séparateur `border-bottom` sur toute la largeur de la barre d'onglets. L'app actuelle utilise le style par défaut de `TabsList` (`components/ui/tabs.tsx`) : fond beige arrondi (`bg-muted`) avec pilule blanche sous l'onglet actif — ça vient du `variant="default"` appliqué implicitement.

**Bonne nouvelle :** `ui/tabs.tsx` a déjà une **variante `line`** codée (`data-[variant=line]`) qui fait exactement ce que la maquette demande (fond transparent, soulignement via pseudo-élément `after:`) — elle n'est simplement pas utilisée sur la page patient.

**Fix :**

```tsx
<TabsList variant="line" className="mb-6 w-full justify-start gap-6 border-b border-stone-200">
  <TabsTrigger value="resume" className="data-active:text-primary-700 data-active:font-semibold after:bg-primary-500">Résumé</TabsTrigger>
  {/* même className sur chaque TabsTrigger */}
```

Vérifier que `after:bg-primary-500` (teal) remplace bien le `after:bg-foreground` par défaut pour la couleur du soulignement actif, et que le texte actif passe en `text-primary-700` (teal-dark) au lieu de `text-foreground`. Garder tous les autres `TabsTrigger` (Dossier clinique, Croissance, Consultations & ordonnances, Documents) avec le même traitement.

## 0ter. Onglet "Dossier clinique" — structure à refaire, pas juste un style

**Écart confirmé :** la maquette affiche 4 cards indépendantes en grille 2 colonnes (`grid2`), chacune avec son propre titre, une icône crayon pour éditer, et une bordure/fond rouge tinté uniquement sur la card "Allergies connues" si elle contient du texte (`clinic-card.has-content`).

L'implémentation actuelle (`PatientClinicalFields.tsx`) est structurellement différente : une seule card verticale en accordéon, chaque champ se déplie via un lien "Modifier ▼"/"Fermer ▲", et un unique bouton "Enregistrer les modifications" sauvegarde tous les champs d'un coup via un seul PATCH. Ce n'est pas qu'une question de couleur — c'est un modèle d'interaction différent.

**Fix — réécrire `PatientClinicalFields.tsx` :**

1. Layout : grille 2 colonnes (`grid grid-cols-1 md:grid-cols-2 gap-3.5`), 4 cards indépendantes (une par champ : Notes médicales, Antécédents médicaux, Allergies connues, Traitements en cours), chacune `rounded-[14px] border border-warm bg-white shadow-warm-sm p-4`.
2. Chaque card : en-tête avec le label du champ (`text-[13.5px] font-semibold`) + une icône crayon (`lucide-react` `Pencil`, taille `size-3.5`, bouton discret en haut à droite) qui bascule cette card précise en mode édition (textarea), indépendamment des 3 autres. Pas d'accordéon qui pousse le contenu vers le bas — le contenu vide affiche `Aucune information` en italique gris clair (`text-stone-300 italic text-xs`), le contenu rempli s'affiche en texte normal (`text-sm text-stone-700`).
3. Sauvegarde : soit un bouton "Enregistrer" discret par card (préférable, plus proche du modèle "édition indépendante" suggéré par la maquette), soit garder un bouton global si plus simple techniquement — mais dans ce cas le mettre hors des 4 cards, pas à l'intérieur d'un conteneur accordéon comme actuellement.
4. Card "Allergies connues" : si `values.allergies` est non vide, appliquer `border-red-200 bg-red-50/30` sur cette card précise uniquement (comme la maquette `clinic-card.has-content`), les 3 autres cards gardent le style neutre même vides.
5. Reprendre `border-warm`/`shadow-warm-sm` (section 1-2 de ce prompt) sur ces 4 cards.

---

## 0quater. Fond de l'app — mauvaise couleur depuis l'abandon de la carte flottante

**Confirmé :** `components/dashboard/DashboardShell.tsx` applique `bg-[#EFEDE3]` (= `--page-bg` de la maquette) comme fond de toute l'app. Dans la maquette, `--page-bg` n'est visible que dans les marges autour de la carte flottante centrée — le fond réel de l'app (sidebar + contenu) utilise `--cream: #FFFBF0`, plus blanc et plus chaud. Comme la carte flottante n'est pas reproduite (décision prise), il faut que le fond principal utilise directement `#FFFBF0` au lieu de `#EFEDE3`, sinon on garde la teinte "coulisse" plus grisâtre qui donne l'impression de fond gris signalée par Driss.

**Fix :** dans `DashboardShell.tsx`, remplacer `bg-[#EFEDE3]` par `bg-cream-100` (le token `--color-cream-100: #FFFBF0` existe déjà dans `globals.css`). Vérifier qu'aucune autre page/composant du dashboard ne référence `#EFEDE3` ou `bg-page-bg` en dur — chercher `EFEDE3` dans tout `apps/frontend/src` et remplacer par `cream-100` partout où c'est utilisé comme fond principal d'app (pas dans les définitions de token elles-mêmes dans `globals.css`, qui peuvent garder les deux couleurs définies pour un usage futur).

## 0quinquies. Couleurs de texte incohérentes — gris Tailwind vs tokens "ink"

**Confirmé :** `globals.css` définit déjà `--color-ink` (#2A241C), `--color-ink-soft` (#8A8175), `--color-ink-softer` (#B9B2A4) — ces tokens génèrent normalement les utilitaires `text-ink`, `text-ink-soft`, `text-ink-softer`. Mais la majorité des composants dashboard utilisent encore les gris Tailwind par défaut (`text-stone-800`, `text-stone-500`, `text-stone-400`, `text-stone-700`), plus froids/neutres que la palette chaude de la maquette. Résultat : mélange visuel incohérent, moins "premium" que la maquette.

**Fix — recherche/remplacement dans `apps/frontend/src/components/dashboard/**`et`apps/frontend/src/app/[locale]/(dashboard)/**` :**

- `text-stone-800` (titres/texte principal) → `text-ink`
- `text-stone-700` (texte secondaire foncé) → `text-ink`
- `text-stone-500` (texte secondaire) → `text-ink-soft`
- `text-stone-400` (texte tertiaire/placeholder) → `text-ink-soft` ou `text-ink-softer` selon le contexte (labels de section en majuscules → `ink-soft`, texte vraiment discret/désactivé → `ink-softer`)
- `border-stone-200`/`border-stone-300` → `border-warm` (déjà couvert section 1-2)

Ne pas toucher aux couleurs sémantiques (rouge erreur, vert succès, ambre badge horaire) ni aux couleurs de marque (primary/cta) — uniquement les gris neutres de texte/bordure.

## 0sexies. Accent orange manquant sur les boutons d'action principaux

**Confirmé :** dans la maquette, le teal est réservé à la navigation (sidebar active, tabs, badges) et **l'orange (`--orange`, token `cta` dans le code) est la couleur des actions principales** (`.btn-primary{background:var(--orange)}`). Dans l'app actuelle, ~17 fichiers / 29 boutons utilisent `bg-primary-700` (teal) pour des CTA qui devraient être orange.

**Règle à appliquer :** un bouton est "action principale de la vue" (orange, `bg-cta-600 hover:bg-cta-700 text-white`) s'il déclenche la création/action centrale de la page — ex. "+ Nouveau patient", "Ajouter à la file d'attente", "+ Nouvelle consultation", "+ Nouvelle ordonnance", "Enregistrer la consultation"/"Enregistrer l'ordonnance" dans les drawers, "Enregistrer les modifications" (dossier clinique, profil). Un bouton reste teal (`bg-primary-700`, ou passe en `btn-ghost` — bordure teal, fond transparent) s'il s'agit d'une action secondaire/de navigation — ex. pagination, filtres, "Annuler", liens de navigation, toggle de vue.

**Action :** repasser les 17 fichiers listés ci-dessous et, pour chaque bouton `bg-primary-700` identifié, décider selon la règle ci-dessus s'il doit passer en `bg-cta-600 hover:bg-cta-700` (orange) ou rester teal :

```
components/dashboard/WaitingRoomList.tsx
components/dashboard/VaccinationRecord.tsx
app/[locale]/(dashboard)/dashboard/patients/new/page.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/edit/EditPatientForm.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/DocumentUpload.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/AddToQueueButton.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/PatientClinicalFields.tsx
app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx
app/[locale]/(dashboard)/dashboard/patients/page.tsx
app/[locale]/(dashboard)/dashboard/patients/PatientTable.tsx
app/[locale]/(dashboard)/dashboard/patients/ImportPatientsButton.tsx
app/[locale]/(dashboard)/dashboard/audit-logs/AuditLogTable.tsx
app/[locale]/(dashboard)/dashboard/settings/ChangePasswordForm.tsx
app/[locale]/(dashboard)/dashboard/settings/ProfileEditor.tsx
app/[locale]/(dashboard)/dashboard/settings/ReferringPractitionersManager.tsx
```

Exemples concrets déjà confirmés à corriger : bouton "Ajouter à la file d'attente" (`AddToQueueButton.tsx`), "+ Nouveau patient" (`patients/page.tsx`), "+ Nouvelle consultation"/"+ Nouvelle ordonnance" (déclencheurs des drawers dans `patients/[id]/page.tsx`), "Enregistrer" dans `ConsultationForm.tsx`/`PrescriptionForm.tsx`.

Ne pas changer la couleur de la sidebar (nav active), des tabs (soulignement), ni des badges de stat cards — ceux-ci restent teal/ambre/orange selon leur rôle déjà défini en section 0bis et dans `LiveStatsWidget.tsx` (déjà correct).

---

## 1. Tokens de design manquants — `apps/frontend/src/app/globals.css`

La maquette utilise des ombres et bordures "chaudes" (teintées ink `#2A241C`), mais `globals.css` n'a **aucun token d'ombre custom** — tout le monde utilise les ombres Tailwind par défaut (grises, plates), ce qui explique le rendu plus "générique" qu'on voit sur les screenshots comparé à la maquette.

Ajouter dans le bloc `@theme` (ou en `:root` classique si plus simple avec le setup Tailwind v4 actuel) :

```css
--shadow-color-warm: 42 36 28; /* pour box-shadow avec rgb() si besoin, sinon garder rgba direct */
```

Et définir des classes utilitaires réutilisables (dans `globals.css`, hors `@theme`, en CSS classique) :

```css
.shadow-warm-sm {
  box-shadow: 0 2px 12px rgba(42, 36, 28, 0.06);
}
.shadow-warm-md {
  box-shadow: 0 10px 28px rgba(42, 36, 28, 0.1);
}
.shadow-warm-lg {
  box-shadow: 0 24px 60px rgba(42, 36, 28, 0.16);
}
```

Ces valeurs sont copiées **exactement** depuis les `:root` variables `--shadow-sm/md/lg` de la maquette (lignes 16-18 du HTML).

Idem pour la bordure : la maquette a deux bordures distinctes —

- `--border: rgba(42,36,28,0.08)` → bordure neutre par défaut des cards
- `--border-teal: rgba(13,148,136,0.16)` → bordure des inputs, sidebar, search

`--color-border-teal` existe déjà dans `globals.css` (ligne ~72). **Ajouter le token manquant `--color-border-warm: rgba(42,36,28,0.08)`** à côté, et l'exposer en classe `border-warm` si le setup Tailwind le permet (`@theme` avec `--color-*` génère automatiquement les utilitaires `border-*`, `bg-*`, etc. — vérifier que `border-warm` fonctionne après ajout).

## 2. Remplacer les bordures/ombres génériques dans tous les composants dashboard

Dans **tous** les fichiers sous `apps/frontend/src/components/dashboard/*.tsx` et `apps/frontend/src/app/[locale]/(dashboard)/**/*.tsx` :

- Remplacer `border-stone-200` → `border-warm` (bordure neutre correcte des cards, ~31 fichiers concernés — recherche globale `border-stone-200`)
- Remplacer `shadow-sm` (sur les cards, PAS sur les boutons/inputs) → `shadow-warm-sm`
- Remplacer `hover:shadow-md` → `hover:shadow-warm-md`
- Là où la maquette a `--shadow-lg` (drawer uniquement, ligne 233 du HTML `.drawer{box-shadow:-10px 0 34px rgba(42,36,28,.18);}`) : vérifier que le composant Drawer/Sheet utilisé pour "Nouvelle consultation"/"Nouvelle ordonnance" a bien cette ombre horizontale spécifique (pas une ombre symétrique générique).

Ne pas toucher aux bordures des inputs (`.field input` dans la maquette utilise `border-teal` — vérifier que c'est déjà le cas, sinon aligner aussi).

## 3. Avatars patients sans couleur de genre — données, pas code

Fichier vérifié : `apps/frontend/src/components/dashboard/PatientAvatar.tsx` — **le composant est correct**, il gère bien `gender === 'girl' → bg-avatar-girl`, `gender === 'boy' → bg-avatar-boy`, et un fallback `bg-stone-300` sinon.

Le problème : tous les patients de démo actuels (Salma Lazrak, Ismail El Amrani, etc.) n'ont pas de valeur dans le champ `gender` (collection `Patients` dans Payload, champ confirmé présent : `apps/cms/src/collections/Patients.ts` ligne ~123), donc tous les avatars tombent sur le gris neutre au lieu du bleu/rose de la maquette.

**Action pour Kilo Code :** ne rien changer dans le code. **Action pour Driss :** renseigner le champ `gender` sur les patients de démo existants (via l'admin Payload ou un script de seed), pour que les avatars retrouvent les couleurs différenciées de la maquette. Je le signale ici pour que ce ne soit pas perdu, mais ce n'est pas un ticket de dev.

## 3bis. Card "File d'attente" en vue d'ensemble — `components/dashboard/QueuePreview.tsx`

Écart confirmé par comparaison directe avec la maquette (lignes 399-411 du HTML) : le composant ajoute 3 éléments absents de la maquette.

Maquette : une seule card avec un `<h3>File d'attente</h3>`, puis directement les `queue-item` (avatar + nom + motif + badge horaire uniquement). Rien d'autre.

Composant actuel : ajoute un sous-en-tête "En attente" avec bordure séparée, un badge de statut (Salle d'attente/En consultation) en plus du badge horaire, et un lien "Voir toute la file d'attente →" en bas de card.

**Action :**

1. Supprimer le bloc sous-en-tête "En attente" (`<div className="flex items-center justify-between border-b ...">`) — le titre de la card doit être uniquement "File d'attente" comme dans la maquette, sans doublon.
2. Retirer le badge de statut (`item.status === 'in_consultation' ? ... `) à droite de chaque ligne — ne garder que le badge horaire ambre, exactement comme la maquette (`time-badge`).
3. Le lien "Voir toute la file d'attente →" n'existe pas dans la maquette. **Le garder quand même** (c'est un ajout utile en navigation, pas une régression) mais le simplifier visuellement pour qu'il ne casse pas la card : pas de bordure `border-t` séparée supplémentaire au-dessus si la maquette n'a qu'un seul bloc — un simple lien discret en bas de card suffit, sans étirer la hauteur avec un bandeau distinct.
4. Reprendre les classes de bordure/ombre définies en section 1-2 de ce prompt (`border-warm`, `shadow-warm-sm`) sur cette card aussi.

Après ce fix, structure finale attendue de la card :

```
File d'attente          ← titre unique, pas de sous-en-tête
[avatar] Nom             09:40   ← badge horaire seul, pas de badge statut
         motif
[avatar] Nom             10:15
         motif
Voir toute la file d'attente →   ← lien simple, gardé mais discret
```

## 3ter. Correction — ce n'était pas (que) un problème de données

**Mise à jour après investigation plus poussée (voir section 0 tout en haut de ce prompt) :** le composant partagé `PatientAvatar.tsx` a un vrai bug (`AvatarFallback` masque la couleur de genre du parent). Une fois ce bug corrigé (section 0), les patients avec `gender` renseigné en base afficheront la bonne couleur partout, y compris dans la liste et la vue d'ensemble.

Il reste malgré tout probablement des patients de démo sans `gender` renseigné en base (ceux créés avant que le champ soit rendu obligatoire) — pour ceux-là, seul le fait de renseigner le champ réglera l'affichage. Section 3 (plus bas) reste valable pour ce cas résiduel.

## 4. Toolbar page Patients — écart mineur de structure

Maquette (ligne 436-438) : un seul bouton icône (3 points horizontaux) à côté de la barre de recherche, intitulé "Exporter / Importer CSV" au survol.

Implémentation actuelle : deux boutons texte explicites "Exporter en CSV" / "Importer un CSV" (visibles sur le screenshot `patients`).

**Recommandation : garder les deux boutons actuels.** Ils sont plus lisibles et plus accessibles que l'icône 3-points de la maquette qui masquait l'action derrière un survol. Ne pas modifier ce point sauf si Driss demande explicitement le rendu maquette pixel pour pixel ici.

## 5. Vérifications à faire (pas de changement anticipé, à confirmer par Kilo Code après lecture du code)

- Table patients (`PatientTable.tsx`) : la maquette a un hover de ligne `background:#FBFAF6` (ligne 176 du HTML) — vérifier que le hover actuel utilise bien cette teinte chaude et pas un gris Tailwind par défaut (`hover:bg-stone-50` par ex. serait légèrement différent).
- Badges "dernière consultation" (récent = fond `--teal-tint` texte `--teal-dark`, ancien = fond `#F3F1EC` texte `--ink-soft`) : déjà cohérent sur les screenshots, juste vérifier que le seuil "récent" dans le code correspond bien à ≤30 jours comme dans la maquette (`daysAgo(p.d) <= 30` ligne 883 du HTML), pas une autre valeur arbitraire.
- Tabs du dossier patient (pill glissante teal) : déjà fidèle sur les screenshots, aucune action.

---

## Portée du prompt

Fichiers à modifier :

- `apps/frontend/src/app/globals.css` (ajout tokens)
- Recherche/remplacement `border-stone-200` → `border-warm` et `shadow-sm`/`hover:shadow-md` → `shadow-warm-sm`/`hover:shadow-warm-md` dans `apps/frontend/src/components/dashboard/**` et `apps/frontend/src/app/[locale]/(dashboard)/**`

Fichiers à NE PAS modifier :

- `PatientAvatar.tsx` (déjà correct)
- Toolbar Patients (garder les 2 boutons)
- Toute logique de layout plein écran / dark mode
