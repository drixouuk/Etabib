# LOT SX-20 — Centralisation du branding et du domaine

## Contexte

Le nom "Dr Tabibi" et le domaine "dr-tabibi.ma" sont actuellement codés en dur dans
plusieurs fichiers. Le projet s'appellera "Etabib", domaine temporaire "etabibi.ma"
(faute de frappe corrigée en "etabib.ma" dans ~1 an). Il faut que ce changement futur
ne touche qu'un seul fichier de config.

## Étape 1 — Fichier de config centralisé

**Fichier à créer** : `apps/frontend/src/lib/brand.ts`

```typescript
export const BRAND = {
  name: "Etabib",
  shortName: "Etabib",
  tagline: "Cabinet médical",
} as const;

export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || "etabibi.ma";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || `contact@${SITE_DOMAIN}`;
export const NOTIFICATIONS_EMAIL =
  process.env.NOTIFICATIONS_EMAIL || `rdv@${SITE_DOMAIN}`;
export const ADMIN_EMAIL =
  process.env.SUPERADMIN_EMAIL || `admin@${SITE_DOMAIN}`;
```

## Étape 2 — Remplacer toutes les occurrences en dur

Remplacer dans chacun de ces fichiers l'usage de "Dr Tabibi" / "dr-tabibi.ma" par
les imports de `BRAND` / `SITE_DOMAIN` / `SUPPORT_EMAIL` / etc. :

- `apps/frontend/src/app/manifest.ts` → `BRAND.name`, `BRAND.shortName`
- `apps/frontend/src/app/[locale]/layout.tsx` (ligne 209, meta apple-mobile-web-app-title)
- `apps/frontend/src/components/onboarding/OnboardingFlow.tsx` (ligne 289, mailto)
- `apps/frontend/src/components/onboarding/SignupForm.tsx` (BASE_DOMAIN fallback)
- `apps/frontend/src/lib/generate-pdf.ts` (ligne 70, texte pied de page PDF)
- `apps/frontend/src/lib/invoiceninja.ts` (ligne 71, notes de facturation)
- `apps/cms/src/create-admin.ts`, `apps/cms/src/seed.ts` → utiliser `ADMIN_EMAIL`
  (attention : ne PAS changer les comptes déjà créés en prod, seulement le script
  de seed pour les futurs déploiements)
- `apps/cms/src/collections/Tenants.ts` (ligne 59, libellé d'aide du champ domaine)

Ne pas toucher aux valeurs déjà en prod dans la base de données (comptes admin
existants, tenants existants) — ce lot ne concerne que le code, pas une migration
de données.

## Étape 3 — Variables d'environnement

Ajouter sur Coolify (frontend + CMS) :
NEXT_PUBLIC_SITE_DOMAIN=etabibi.ma
NEXT_PUBLIC_SUPPORT_EMAIL=contact@etabibi.ma
NOTIFICATIONS_EMAIL=rdv@etabibi.ma
SUPERADMIN_EMAIL=admin@etabibi.ma

## Étape 4 — JSON-LD et SEO (Lot 1 déjà en place)

Vérifier que le schema.org `MedicalOrganization` (Lot 1) utilise bien `SITE_URL`
et `BRAND.name` plutôt que des chaînes en dur — ne pas dupliquer le nom ailleurs.

---

## Fichiers Lot SX-20

| Action   | Fichier                                                                     |
| -------- | --------------------------------------------------------------------------- |
| Créer    | `apps/frontend/src/lib/brand.ts`                                            |
| Modifier | Les 9 fichiers listés ci-dessus (remplacer le texte en dur par les imports) |
| Env      | 4 variables sur Coolify (frontend + CMS)                                    |
