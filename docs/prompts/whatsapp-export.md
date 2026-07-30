# Issue : Export ordonnance/certificat vers WhatsApp en un clic

## Contexte

- Les boutons PDF sont déjà en place sur chaque consultation et prescription (#5).
- WhatsApp est le canal de communication de facto au Maroc entre médecin et patient.
- Le flux : médecin clique PDF → télécharge → ouvre WhatsApp → cherche le contact → envoie le fichier. Trop d'étapes.
- Objectif : bouton "WhatsApp" à côté du bouton "PDF" qui ouvre directement une conversation WhatsApp avec le patient, message pré-rempli.
- Limitation technique : pas possible d'attacher un fichier via lien WhatsApp Web. Le bouton ouvre une conversation avec un texte pré-rempli. Le médecin peut ensuite coller le PDF dans la conversation (1 clic supplémentaire au lieu de 4).

---

## Travail à faire

### 1. Fonction utilitaire WhatsApp

**Fichier à créer** : `apps/frontend/src/lib/whatsapp.ts`

```typescript
/**
 * Formate un numéro de téléphone pour l'API WhatsApp (wa.me).
 * Accepte les formats : +212 6 12 34 56 78, 0612345678, 212612345678
 * Retourne : 212612345678 (sans le +)
 */
export function formatWhatsAppNumber(phone: string): string | null {
  const cleaned = phone.replace(/[\s.\-()]/g, '')
  // Format international avec +
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1) // retire le +
  }
  // Format marocain 0X...
  if (cleaned.startsWith('0')) {
    return `212${cleaned.slice(1)}`
  }
  // Déjà sans + (ex: 212...)
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned
  }
  return null
}

/**
 * Ouvre une conversation WhatsApp avec le patient.
 */
export function openWhatsApp(phone: string, message: string) {
  const number = formatWhatsAppNumber(phone)
  if (!number) return
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
```

### 2. Bouton WhatsApp dans ConsultationForm

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx`

#### 2a. Import

```tsx
import { openWhatsApp } from '@/lib/whatsapp'
```

#### 2b. Bouton WhatsApp par consultation

Pour chaque consultation dans l'historique, ajouter un bouton "WhatsApp" si le patient a un téléphone :

```tsx
{patientInfo?.phone && c.diagnostic && (
  <button
    onClick={() =>
      openWhatsApp(
        patientInfo.phone,
        `Certificat de consultation du ${new Date(c.date).toLocaleDateString('fr-FR')}\n` +
        `Patient : ${patientInfo.name}\n` +
        (c.motif ? `Motif : ${c.motif}\n` : '') +
        (c.diagnostic ? `Diagnostic : ${c.diagnostic}\n` : '') +
        `\nDr ${doctorInfo?.name}`
      )
    }
    className="text-xs font-medium text-green-600 hover:text-green-700"
    title="Partager via WhatsApp"
  >
    WhatsApp
  </button>
)}
```

Placer à côté du bouton "PDF" existant, dans le `<div className="flex items-baseline justify-between">`, dans un groupe avec le bouton PDF :

```tsx
<div className="flex items-center gap-2">
  {/* bouton PDF existant */}
  {/* bouton WhatsApp */}
</div>
```

Style : `text-green-600 hover:text-green-700` (vert WhatsApp).

### 3. Bouton WhatsApp dans PrescriptionForm

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`

Même pattern.

#### 3a. Import

```tsx
import { openWhatsApp } from '@/lib/whatsapp'
```

#### 3b. Bouton WhatsApp par prescription

Pour chaque prescription avec des médicaments :

```tsx
{patientInfo?.phone && p.medications?.length > 0 && (
  <button
    onClick={() => {
      const meds = p.medications
        .map(m => `• ${m.nom} — ${m.posologie} — ${m.duree}`)
        .join('\n')
      openWhatsApp(
        patientInfo.phone,
        `Ordonnance du ${new Date(p.date).toLocaleDateString('fr-FR')}\n` +
        `Patient : ${patientInfo.name}\n\n` +
        `${meds}\n` +
        (p.notes ? `\nNotes : ${p.notes}\n` : '') +
        `\nDr ${doctorInfo?.name}`
      )
    }}
    className="text-xs font-medium text-green-600 hover:text-green-700"
    title="Partager via WhatsApp"
  >
    WhatsApp
  </button>
)}
```

### 4. Gestion du cas "pas de téléphone"

Si le patient n'a pas de numéro de téléphone, le bouton WhatsApp n'apparaît pas. Aucun message d'erreur — c'est implicite.

---

## Ce qui est hors scope

- **Pièce jointe automatique** — impossible via WhatsApp Web (nécessite WhatsApp Business API).
- **Historique des envois** — pas de tracking des messages envoyés.
- **Modèles de message personnalisables** — le message est généré automatiquement à partir des données de la consultation/ordonnance.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/lib/whatsapp.ts` | `formatWhatsAppNumber()` + `openWhatsApp()` |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx` | Bouton WhatsApp par consultation |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx` | Bouton WhatsApp par prescription |

---

## Règles obligatoires

1. **Design system** : le vert WhatsApp (`text-green-600`) est une exception volontaire (couleur de marque WhatsApp). Pas de token sémantique ici.
2. **Pas de `any`**.
3. **Sécurité** : `window.open` avec `noopener,noreferrer` pour éviter le tab-napping.
4. **Format téléphone** : gérer les formats marocains courants (06..., +212..., 212...).

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `lib/whatsapp.ts` — fonctions utilitaires
2. `ConsultationForm.tsx` — bouton WhatsApp
3. `PrescriptionForm.tsx` — bouton WhatsApp
4. Build gate
