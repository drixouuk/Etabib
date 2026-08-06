# Langue d'affichage vs Langue de données (Phase A — A4)

> Règle héritée de l'analyse Yuvomi (issues #631/#632) : l'UI et les données
> stockées ne parlent pas la même langue, et c'est délibéré.

## Les deux langues

| | Langue d'**affichage** | Langue de **données** |
|---|---|---|
| Ce que c'est | La langue que le visiteur voit dans l'UI | La langue dans laquelle le contenu métier est **stocké** (Payload CMS) |
| Déterminée par | Le segment de locale de l'URL (`/fr`, `/en`, `/ar`, `/tzm`) | Le mapping fixe `DATA_LOCALE` (`apps/frontend/src/app/[locale]/layout.tsx`) : `fr → fr`, `en → en`, `ar → ar`, `tzm → fr` |
| Exemple | Un visiteur `ar` voit l'UI en arabe RTL | Le contenu Payload (bio, services, infos praticien) reste stocké en français — la langue de données du cabinet est `fr` |

## Règles pour tout nouveau code

1. **Contenu Payload** : toujours charger les collections avec la langue de
   données explicite : `getDoctorProfile(tenantId, dataLocale)` — jamais avec
   la locale d'affichage. Une locale d'affichage ne doit pas créer de contenu
   dupliqué en 4 langues ni changer ce que le serveur stocke.
2. **Emails / notifications / SMS** : les messages sont **assemblés à partir de
   données brutes**, jamais de phrases complètes construites côté serveur dans
   une langue devinée. Le serveur ne connaît pas la langue du destinataire
   (locale = localStorage/URL, côté client). Transporter les données (nom,
   date, montant), appliquer la langue **au rendu** avec un paramètre explicite
   (`t(key, { locale })` / `next-intl`).
3. **Titres générés** (métadonnées, sujets) : maps par locale explicites
   (`const titles: Record<string, string> = { fr, en, ar, tzm }` avec fallback
   `fr`), jamais de traduction serveur implicite.
4. **Champs libres saisis par l'utilisateur** (notes, dossiers patients) :
   stockés tels quels, aucune normalisation de langue.

## Références existantes

- `DATA_LOCALE` — mapping display → data dans `[locale]/layout.tsx`
- `getDoctorProfile(tenantId, dataLocale)` / `getPracticeInfo(dataLocale)` —
  chargement CMS par langue de données
- `titles` / `descriptions` par locale dans `generateMetadata` (landing,
  `[locale]/layout.tsx`)

## Tests

Le guard `guard-i18n` (parité des messages) et le guard A4 (propriétés
logiques RTL) sont les garde-fous de cette règle côté frontend.
