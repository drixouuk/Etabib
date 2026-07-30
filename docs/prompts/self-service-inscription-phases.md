# Self-service inscription — Plan d'exécution multi-phases

> **Règle :** Chaque phase (P1→P7) doit être exécutée séquentiellement. Après chaque phase, faire `pnpm build` dans `apps/frontend`, résoudre toute erreur, puis attendre la confirmation avant de passer à la suivante. **Ne jamais casser l'existant.** Respecter le design system dans `design-system/MASTER.md`.

---

## Architecture cible

```
Landing page (/landing)
  ├─ CTA Vitrine  → /onboarding?plan=vitrine
  ├─ CTA RDV      → /onboarding?plan=rdv
  └─ CTA Cabinet  → [Démo: DEMO_URL] [S'inscrire: /onboarding?plan=cabinet]
         ↓
Onboarding (/onboarding?plan=xxx) — page unique, pas de wizard
  ├─ Plan pré-sélectionné (carte verrouillée, lien "changer")
  ├─ [si vitrine] Bandeau upsell "Ajoutez la prise de RDV pour 199 MAD/mois"
  ├─ Formulaire allégé : nom cabinet, nom médecin, spécialité, sous-domaine, téléphone, email, mot de passe
  ├─ [si cabinet/rdv] Placeholder paiement
  └─ Validation sous-domaine en temps réel
         ↓
POST /api/onboarding
  ├─ 1. Vérifier sous-domaine (blacklist + unicité)
  ├─ 2. Générer calendarToken (32 chars) + verificationToken
  ├─ 3. Créer Tenant { domain, tier, calendarToken }
  ├─ 4. Créer User { email, password, roles: [tenant_admin, doctor], emailVerified: false }
  ├─ 5. Créer Doctor { name, specialty, tenant }
  ├─ 6. Créer PracticeInfo { phone, tenant }
  ├─ 7. [si tier !== vitrine] Créer AvailabilitySlots vides
  ├─ 8. [si tier !== vitrine] Invoice Ninja → créer client + placeholder facture
  ├─ 9. Email vérification (Resend) avec lien de confirmation
  └─ 10. Email bienvenue (Resend) avec :
        ├─ Site : https://{subdomain}.etabibi.ma
        ├─ Login : https://{subdomain}.etabibi.ma/login
        └─ iCal : https://etabibi.ma/api/calendar/{subdomain}.ics?token={token}
         ↓
Espace praticien (dashboard filtré par tier)
  ├─ Vitrine : Paramètres
  ├─ RDV     : Rendez-vous, Paramètres
  └─ Cabinet : Full dashboard
         ↓
Paramètres (tous tiers)
  ├─ Profil (nom, spécialité, photo, bio, langues)
  ├─ Cabinet (adresse, ville, téléphone, email, tagline)
  ├─ Horaires (jours + créneaux)
  ├─ Services (CRUD)
  ├─ Site web (sous-domaine, aperçu)
  ├─ Calendrier (disponibilités, lien iCal, régénérer token)
  ├─ Facturation (plan actuel, historique, upgrade/downgrade)
  └─ Sécurité (changer email, changer mot de passe)
```

---

## P1 — Landing page : CTAs localisés + sélecteur de langue

### Objectif
- Remplacer les CTAs hardcodés (`href="/fr/inscription"`) par des `Link` next-intl localisés avec query params `?plan=`
- Ajouter un second bouton "Démo" sur la carte Cabinet
- Ajouter le `LanguageSwitcher` dans le header de la landing page
- Ajouter les traductions `landing` manquantes dans `ar.json` et `tzm.json`

### Fichiers à modifier

#### 1.1 `apps/frontend/src/app/[locale]/landing/page.tsx`

**Import à ajouter en haut :**
```tsx
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
```

**Remplacer les 3 CTAs de la section pricing (lignes 363, 380, 398) :**

- Vitrine : `href="/fr/onboarding"` → `<Link href="/onboarding?plan=vitrine" ...>`
- RDV : `href="/fr/onboarding"` → `<Link href="/onboarding?plan=rdv" ...>`
- Cabinet : Remplacer le CTA unique par **deux boutons** :
```tsx
<div className="flex flex-col gap-2.5">
  <Link href="/onboarding?plan=cabinet"
    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta-600 px-6 py-3 text-[.97rem] font-bold text-white shadow-sm transition-all hover:bg-cta-700">
    {t('price_cta_cabinet')} <ArrowRight className="size-[18px]" />
  </Link>
  <a href={DEMO_URL} target="_blank" rel="noopener"
    className="inline-flex w-full items-center justify-center rounded-full border border-stone-200/50 bg-transparent px-6 py-3 text-[.97rem] font-bold text-[#2A241C] transition-all hover:border-primary-500 hover:text-primary-700 hover:bg-white">
    {t('price_cta_demo')}
  </a>
</div>
```

**Ajouter les clés manquantes dans `fr.json` et `en.json` :**
```json
"price_cta_demo": "Essayer la démo"  // fr
"price_cta_demo": "Try the demo"     // en
```

**Ajouter `<LanguageSwitcher />` dans le header** (entre le bouton CTA démo et le bouton hamburger mobile, ligne ~114) :
```tsx
<div className="flex items-center gap-3.5">
  <a href={DEMO_URL} ...>...</a>
  <LanguageSwitcher />
  <button onClick={...}>...</button>
</div>
```

#### 1.2 `apps/frontend/messages/ar.json` et `apps/frontend/messages/tzm.json`

Ajouter le namespace `"landing"` complet. Les traductions complètes (arabe et tifinagh) sont fournies dans `docs/prompts/SX8-landing-i18n.md`.

**Technique JSON :** Remplacer les 2 dernières lignes `  }\n}` par `  },\n  "landing": { ... }\n}`.

Nouvelle clé à ajouter dans les 4 fichiers :
- fr : `"price_cta_demo": "Essayer la démo"`
- en : `"price_cta_demo": "Try the demo"`
- ar : `"price_cta_demo": "جرب النسخة التجريبية"`
- tzm : `"price_cta_demo": "ⵊⵔⵔⴱ ⵜⴰⵎⴰⵡⵜ"`

### Vérification
```bash
cd apps/frontend && pnpm build
```
Les liens doivent pointer vers `/fr/onboarding?plan=vitrine` (etc.) et le sélecteur de langue doit apparaître sur `/fr/landing`.

---

## P2 — Onboarding : page unique avec plan pré-sélectionné

### Objectif
Remplacer le wizard 3 étapes (`StepIndicator` + sélection de tier → formulaire → confirmation) par une **page unique** où le plan est déjà sélectionné via `?plan=` query param.

### Changements

#### 2.1 `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`

**Nouveau comportement :**
- Lire `plan` depuis `useSearchParams()` (next/navigation)
- Si `plan` absent → afficher la grille de sélection des tiers (comportement actuel step 0)
- Si `plan=vitrine|rdv|cabinet` → afficher directement le formulaire avec le plan verrouillé
- Le plan sélectionné est affiché en carte verrouillée en haut (pas de `setSelectedTier`)
- Un lien "Choisir une autre formule" permet de revenir à la sélection
- [si vitrine] Bandeau upsell : "Ajoutez la prise de RDV en ligne pour 199 MAD/mois" → lien vers `?plan=rdv`

**Supprimer :** `StepIndicator`, `useState(step)`, la logique `handleTierClick/Continue`, l'étape de confirmation (step 2).

**Conserver :** `SignupForm` avec les props existantes.

**Nouveau flux simplifié :**
```
Si plan absent :
  → Grille 4 cartes (TierCard × 4) → clic → recharge avec ?plan=xxx
  
Si plan présent :
  → Carte plan verrouillée (read-only)
  → [si vitrine] Bandeau upsell
  → SignupForm
  → Bouton submit → POST /api/onboarding → redirection vers le site vitrine
```

**Ajouter les clés manquantes dans `fr.json` et `en.json` (namespace onboarding) :**
```json
"onboarding": {
  "title": "Créer votre espace professionnel",
  "subtitle": "Complétez vos informations pour démarrer",
  "selectedPlan": "Formule sélectionnée",
  "changePlan": "Choisir une autre formule",
  "upsellVitrine": "Ajoutez la prise de RDV en ligne pour 199 MAD/mois",
  "upsellVitrineCTA": "Voir la formule RDV",
  "paymentPlaceholder": "Paiement — disponible prochainement",
  "creating": "Création de votre espace en cours…"
}
```

#### 2.2 `apps/frontend/src/app/[locale]/onboarding/page.tsx`

**Remplacer le contenu actuel par :**
```tsx
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:py-24">
      <OnboardingFlow />
    </div>
  )
}
```

Note : `max-w-xl` (au lieu de `max-w-4xl`) car on n'a plus 4 cartes côte à côte sur la page unique.

### Vérification
```bash
cd apps/frontend && pnpm build
```
Tester : `/fr/onboarding?plan=vitrine` affiche formulaire avec plan Vitrine verrouillé. `/fr/onboarding` affiche la grille de sélection.

---

## P3 — API onboarding : provisioning complet + email vérification

### Objectif
Enrichir `POST /api/onboarding` pour créer toutes les ressources nécessaires, ajouter la validation sous-domaine, l'email de vérification, et une route de vérification.

### Changements

#### 3.1 CMS — Ajouter les champs dans `Tenants`

**Fichier :** `apps/cms/src/collections/Tenants.ts`

Ajouter dans le groupe `settings` :
```ts
{
  name: 'calendarToken',
  type: 'text',
  admin: { readOnly: true, hidden: true },
  label: 'Token calendrier iCal',
}
```

Ajouter dans le groupe `settings` (ou à la racine si plus simple) :
```ts
{
  name: 'emailVerified',
  type: 'checkbox',
  defaultValue: false,
  admin: { readOnly: true, hidden: true },
}
```

#### 3.2 `apps/frontend/src/app/api/onboarding/route.ts`

**Réécriture complète.** Workflow :

```
1. Valider les champs (domain, name, email, password, tier, specialty, fullName)
2. Vérifier sous-domaine :
   - Blacklist : ['admin','api','app','www','mail','smtp','pop','imap','ftp','cdn','dev','staging','test','demo','blog','shop','store','help','support','status','docs','dashboard','cms','static','assets','media','files','images','img','css','js','web','portal','site','www2','m','mobile']
   - Vérifier unicité dans Payload : GET /api/tenants?where[domain][equals]=...
   → 409 si déjà pris
3. Générer calendarToken (crypto.randomUUID()) + verificationToken (crypto.randomUUID())
4. Créer Tenant { name, domain, settings: { defaultLocale, activeTier, specialty, doctorCount, calendarToken, emailVerified: false } }
5. Créer User { email, password, name: fullName, roles: [tenant_admin, doctor], tenant: tenantId, _verified: false }
6. Créer Doctor { name: fullName, specialty, tenant: tenantId, slug: subdomain }
7. Créer PracticeInfo { phone, tenant: tenantId }
8. [si tier !== vitrine] Créer 6 AvailabilitySlots (Lun-Sam, 09:00-17:00, 30min, 15min buffer)
9. [si tier !== vitrine] Invoice Ninja → createClient + createSubscriptionInvoice
10. Envoyer email vérification (Resend) :
    - Template : "verify-email"
    - Lien : https://{domain}.etabibi.ma/api/onboarding/verify-email?token={verificationToken}
11. Envoyer email bienvenue (Resend) :
    - Template : "welcome"
    - Variables : doctorName, siteUrl, loginUrl, icalUrl (si RDV/cabinet)
12. Return { success, tenant: { id, domain }, user: { email } }
```

**Ajouter ces imports :**
```ts
import { randomUUID } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SUBDOMAIN_BLACKLIST = ['admin','api','app','www','mail','smtp','pop','imap','ftp','cdn','dev','staging','test','demo','blog','shop','store','help','support','status','docs','dashboard','cms','static','assets','media','files','images','img','css','js','web','portal','site','www2','m','mobile']
```

**Fonction helper pour créer les AvailabilitySlots :**
```ts
async function createDefaultSlots(tenantId: string, token?: string) {
  const days = ['1','2','3','4','5','6'] // Lun-Sam
  for (const dayOfWeek of days) {
    await cmsPost('/availability-slots', {
      tenant: tenantId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      durationMinutes: 30,
      bufferMinutes: 15,
      isActive: true,
    }, token)
  }
}
```

**Nouveau body accepté :** Ajouter `fullName` (nom du médecin, distinct de `name` qui est le nom du cabinet).

#### 3.3 `GET /api/onboarding/check-subdomain?domain=xxx`

**Fichier à créer :** `apps/frontend/src/app/api/onboarding/check-subdomain/route.ts`

```ts
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
  
  const subdomain = domain.split('.')[0].toLowerCase()
  if (SUBDOMAIN_BLACKLIST.includes(subdomain)) {
    return NextResponse.json({ available: false, reason: 'blacklisted' })
  }
  
  const fullDomain = `${subdomain}.${SITE_DOMAIN}`
  const res = await fetch(`${CMS_URL}/api/tenants?where[domain][equals]=${fullDomain}&limit=1`)
  const data = await res.json()
  const available = !data?.docs?.length
  return NextResponse.json({ available })
}
```

#### 3.4 `GET /api/onboarding/verify-email?token=xxx`

**Fichier à créer :** `apps/frontend/src/app/api/onboarding/verify-email/route.ts`

```ts
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  
  // Chercher le tenant avec ce verificationToken
  // PATCH tenant.settings.emailVerified = true
  // PATCH user._verified = true
  // Redirect vers le login avec ?verified=true
  
  return NextResponse.redirect(new URL('/login?verified=true', req.url))
}
```

### Vérification
```bash
cd apps/frontend && pnpm build
```
Tester : `POST /api/onboarding` avec body complet → vérifier que Doctor et PracticeInfo sont créés dans le CMS.

---

## P4 — Dashboard : filtrage menu par tier

### Objectif
- Ouvrir le dashboard aux utilisateurs Vitrine et RDV (actuellement bloqué : redirige vers `/` si tier !== cabinet)
- Filtrer les items de la sidebar selon le tier
- Supprimer la redirection dans `(dashboard)/layout.tsx`

### Changements

#### 4.1 `apps/frontend/src/app/[locale]/(dashboard)/layout.tsx`

**Supprimer la redirection non-cabinet :**
```diff
-    if (!tier || (tier !== 'cabinet')) {
-      redirect('/')
-    }
```

Laisser le reste inchangé. Tous les utilisateurs authentifiés accèdent au dashboard.

#### 4.2 `apps/frontend/src/components/dashboard/Sidebar.tsx`

**Modifier `navItems` en fonction du tier :**

```tsx
const tier = tenant?.settings?.activeTier

interface TierNavConfig {
  items: NavItem[]
  adminItems: NavItem[]
}

const tierNav: Record<string, TierNavConfig> = {
  vitrine: {
    items: [
      { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
    ],
    adminItems: [],
  },
  rdv: {
    items: [
      { label: 'Rendez-vous', href: '/dashboard/rendez-vous', icon: <Calendar className="size-4" /> },
      { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
    ],
    adminItems: [],
  },
  cabinet: {
    items: [
      { label: "Vue d'ensemble", href: '/dashboard', icon: <LayoutDashboard className="size-4" /> },
      { label: 'Patients', href: '/dashboard/patients', icon: <Users className="size-4" /> },
      { label: "File d'attente", href: '/dashboard/queue', icon: <ListOrdered className="size-4" /> },
      { label: 'Activité', href: '/dashboard/activity', icon: <BarChart3 className="size-4" /> },
      { label: 'Rendez-vous', href: '/dashboard/rendez-vous', icon: <Calendar className="size-4" /> },
      { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
    ],
    adminItems: [
      { label: "Registre d'audit", href: '/dashboard/audit-logs', icon: <FileText className="size-4" /> },
      { label: 'Alertes système', href: '/dashboard/system-alerts', icon: <ShieldAlert className="size-4" /> },
    ],
  },
}

const config = tierNav[tier || 'vitrine'] || tierNav.vitrine
const navItems = config.items
const adminItems = config.adminItems
```

**Corriger les couleurs hardcodées** (conformité design system v1.2) :
- `text-[#2A241C]` → `text-stone-800`
- `text-[#8A8175]` → `text-stone-600`
- `text-[#2A241C]-soft` → `text-stone-600`
- `text-[#2A241C]-softer` → `text-stone-400`

### Vérification
```bash
cd apps/frontend && pnpm build
```
Tester : connexion avec compte Vitrine → sidebar affiche uniquement "Paramètres". Connexion compte RDV → "Rendez-vous" + "Paramètres". Compte Cabinet → menu complet.

---

## P5 — Paramètres : expansion pour tous les tiers

### Objectif
Ajouter de nouveaux onglets dans `SettingsTabsContent` pour que les médecins puissent éditer le contenu de leur page vitrine depuis l'espace praticien.

### Changements

#### 5.1 Nouveaux composants

Créer dans `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/` :

| Fichier | Rôle |
|---|---|
| `PracticeEditor.tsx` | Éditer adresse, ville, téléphone, email, tagline |
| `ScheduleEditor.tsx` | Éditer horaires d'ouverture (Lun-Dim, créneaux) |
| `ServicesEditor.tsx` | CRUD des services (titre, description, icône, ordre) |
| `SiteEditor.tsx` | Voir/modifier le sous-domaine, afficher l'URL du site |
| `CalendarSettings.tsx` | Afficher/copier/régénérer le lien iCal, instructions par plateforme |
| `BillingSettings.tsx` | Plan actuel, historique factures, boutons upgrade/downgrade |

Chaque composant est un Client Component qui utilise `fetchCMS` / `postCMS` / `patchCMS` pour les opérations CRUD via le proxy CMS.

#### 5.2 `SettingsTabsContent.tsx`

**Ajouter les nouveaux onglets** (visibles par tous les tiers, admin ou pas) :

```tsx
<TabsTrigger value="practice">Cabinet</TabsTrigger>
<TabsTrigger value="schedule">Horaires</TabsTrigger>
<TabsTrigger value="services">Services</TabsTrigger>
<TabsTrigger value="site">Site web</TabsTrigger>
<TabsTrigger value="calendar">Calendrier</TabsTrigger>
<TabsTrigger value="billing">Facturation</TabsTrigger>
<SecurityTab /> {/* mot de passe, déjà existant via ChangePasswordForm */}
```

Tous les onglets sont visibles par tous les utilisateurs (plus de condition `isAdmin`).

#### 5.3 `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx`

**Ajouter le fetch des données nécessaires :**
- `tenant` (domain, settings) → via `getTenantById` ou `fetchCMS`
- `practiceInfo` → GET `/api/cms-proxy/practice-info?where[tenant][equals]=...`
- `services` → GET `/api/cms-proxy/services?where[tenant][equals]=...`
- `availabilitySlots` → GET `/api/cms-proxy/availability-slots?where[tenant][equals]=...`

#### 5.4 Nouveau composant `CalendarSettings.tsx`

```tsx
'use client'
// Affiche :
// - URL iCal : https://etabibi.ma/api/calendar/{domain}.ics?token={token}
// - Bouton "Copier le lien"
// - Bouton "Régénérer le token" (PATCH tenant.settings.calendarToken)
// - Instructions : Google Calendar, Apple Calendar, Outlook
```

**Régénération du token :**
```ts
await fetch('/api/cms-proxy/tenants/{id}', {
  method: 'PATCH',
  body: JSON.stringify({ settings: { calendarToken: crypto.randomUUID() } }),
})
```

#### 5.5 Nouveau composant `BillingSettings.tsx`

- Affiche le plan actuel (Vitrine/RDV/Cabinet) avec badge
- Pour Vitrine → bouton "Passer à RDV" et "Passer à Cabinet"
- Pour RDV → bouton "Passer à Cabinet"
- Pour Cabinet → message "Formule la plus complète"
- L'upgrade fait un `PATCH` du tenant `settings.activeTier` + crée les ressources manquantes (ex: AvailabilitySlots si upgrade vitrine→rdv)

### Vérification
```bash
cd apps/frontend && pnpm build
```
Tester : `/fr/dashboard/settings` → tous les onglets visibles, édition des champs fonctionnelle.

---

## P6 — iCal feed + changement de mot de passe oublié

### Objectif
- Créer l'endpoint iCal public protégé par token
- Pages forgot password + reset password (proxy Payload CMS)

### Changements

#### 6.1 `GET /api/calendar/[slug].ics`

**Fichier à créer :** `apps/frontend/src/app/api/calendar/[slug]/route.ts`

```ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = req.nextUrl.searchParams.get('token')
  
  // 1. Trouver le tenant par le sous-domaine (slug = drdupond pour drdupond.etabibi.ma)
  const tenantRes = await fetch(`${CMS_URL}/api/tenants?where[domain][equals]=${slug}.${SITE_DOMAIN}&limit=1`)
  const tenants = await tenantRes.json()
  const tenant = tenants?.docs?.[0]
  if (!tenant || tenant.settings?.calendarToken !== token) {
    return new Response('Not found', { status: 404 })
  }
  
  // 2. Récupérer les bookings à venir
  const bookingsRes = await fetch(`${CMS_URL}/api/calbookings?where[tenant][equals]=${tenant.id}&where[status][equals]=accepted&where[startTime][greater_than]=${new Date().toISOString()}&limit=500`)
  const bookings = await bookingsRes.json()
  
  // 3. Générer iCal (RFC 5545)
  const ics = generateICS(bookings.docs, tenant.name)
  
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${slug}.ics"`,
    },
  })
}

function generateICS(bookings: any[], tenantName: string): string {
  const events = bookings.map(b => {
    const uid = b.bookingUid
    const start = formatICSDate(new Date(b.startTime))
    const end = formatICSDate(new Date(b.endTime))
    const summary = b.title || 'Consultation'
    const description = `Patient: ${b.attendeeName || 'N/A'}\nTéléphone: ${b.attendeePhone || 'N/A'}`
    return `BEGIN:VEVENT
UID:${uid}
DTSTART:${start}
DTEND:${end}
SUMMARY:${summary}
DESCRIPTION:${escapeICS(description)}
END:VEVENT`
  }).join('\n')
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Etabib//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${tenantName} - Etabib
${events}
END:VCALENDAR`
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
```

#### 6.2 Mot de passe oublié

**Fichier à créer :** `apps/frontend/src/app/[locale]/mot-de-passe-oublie/page.tsx`

Formulaire : email → `POST to CMS /api/users/forgot-password`. Payload CMS envoie l'email automatiquement.

**Fichier à créer :** `apps/frontend/src/app/[locale]/reinitialiser-mot-de-passe/page.tsx`

Lit `?token=` depuis l'URL, affiche formulaire nouveau mot de passe → `POST to CMS /api/users/reset-password`.

**Ajouter le lien dans la page login :**
Dans `apps/frontend/src/app/[locale]/login/page.tsx`, ajouter sous le formulaire :
```tsx
<Link href="/mot-de-passe-oublie" className="text-sm text-stone-600 hover:text-primary-700">
  Mot de passe oublié ?
</Link>
```

### Vérification
```bash
cd apps/frontend && pnpm build
```
Tester : `GET /api/calendar/drguinane.ics?token=xxx` → fichier iCal valide. `/fr/mot-de-passe-oublie` → formulaire fonctionnel.

---

## P7 — Finalisation : onboarding UX + Resend templates

### Objectif
- Validation sous-domaine en temps réel dans le SignupForm (onBlur)
- Créer les templates Resend (verify-email, welcome)
- Revue complète, lint, types

### Changements

#### 7.1 Validation sous-domaine temps réel

Dans `SignupForm.tsx`, ajouter un `onBlur` sur le champ subdomain qui appelle `GET /api/onboarding/check-subdomain?domain=xxx` :

```tsx
const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle')

const checkSubdomain = async (value: string) => {
  if (value.length < 3) return
  setSubdomainStatus('checking')
  try {
    const res = await fetch(`/api/onboarding/check-subdomain?domain=${value}`)
    const { available } = await res.json()
    setSubdomainStatus(available ? 'available' : 'unavailable')
  } catch {
    setSubdomainStatus('idle')
  }
}
```

Afficher un indicateur visuel sous le champ :
- `checking` → spinner
- `available` → check vert "Disponible"
- `unavailable` → croix rouge "Indisponible"

#### 7.2 Templates Resend

Utiliser l'API Resend pour créer les templates (si pas déjà existants) :

**Template `verify-email` :**
```
Subject: Vérifiez votre adresse email — Etabib
Body: Bonjour {{doctorName}}, merci d'avoir créé votre espace Etabib. 
Cliquez sur le lien pour vérifier votre adresse email : {{verificationUrl}}
```

**Template `welcome` :**
```
Subject: Bienvenue sur Etabib, {{doctorName}} !
Body: Votre cabinet {{practiceName}} est prêt.
- Votre site : {{siteUrl}}
- Connexion : {{loginUrl}}
{{#if icalUrl}}- Synchronisez vos RDV : {{icalUrl}}{{/if}}
```

#### 7.3 Revue finale

- `pnpm build` — doit passer sans erreur
- Vérifier qu'aucun fichier existant n'a été cassé
- Vérifier la conformité design system : couleurs sémantiques (`primary`, `stone`, `cta`, `cream`), pas de couleurs Tailwind brutes, marges logiques RTL
- Vérifier que `pnpm lint` ne produit pas de nouvelles erreurs

---

## Résumé des fichiers créés/modifiés par phase

| Phase | Créés | Modifiés |
|---|---|---|
| P1 | — | `landing/page.tsx`, `fr.json`, `en.json`, `ar.json`, `tzm.json` |
| P2 | — | `OnboardingFlow.tsx`, `onboarding/page.tsx` |
| P3 | `api/onboarding/check-subdomain/route.ts`, `api/onboarding/verify-email/route.ts` | `api/onboarding/route.ts`, `Tenants.ts` (CMS) |
| P4 | — | `Sidebar.tsx`, `(dashboard)/layout.tsx` |
| P5 | `settings/PracticeEditor.tsx`, `ScheduleEditor.tsx`, `ServicesEditor.tsx`, `SiteEditor.tsx`, `CalendarSettings.tsx`, `BillingSettings.tsx` | `SettingsTabsContent.tsx`, `settings/page.tsx` |
| P6 | `api/calendar/[slug]/route.ts`, `mot-de-passe-oublie/page.tsx`, `reinitialiser-mot-de-passe/page.tsx` | `login/page.tsx` |
| P7 | — | `SignupForm.tsx`, templates Resend (API) |

## Règles strictes

1. **Design system :** `design-system/MASTER.md` est la source de vérité. Utiliser les tokens sémantiques (`primary-*`, `stone-*`, `cta-*`, `cream-*`), jamais de couleurs Tailwind brutes. Dashboard et site public partagent `stone-*`/`shadow-*` depuis v1.2.
2. **Ne pas casser l'existant :** Chaque modification doit préserver le comportement actuel pour les features non concernées.
3. **Dashboard en français uniquement :** Seuls le site vitrine et la landing page sont multilingues.
4. **RTL :** Utiliser les propriétés logiques (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) dans tous les nouveaux composants.
5. **Build gate :** Après chaque phase, `pnpm build` dans `apps/frontend` doit passer. Résoudre toute erreur avant de passer à la phase suivante.
