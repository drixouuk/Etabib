# LOT SX-3 — Notifications + cycle de vie complet

## Contexte

- Phases 1 & 2 déployées : agenda interne + réservation publique + gestion des disponibilités.
- Il manque : confirmation email au patient, annulation/report, rappels automatiques, stats de présence.

---

## Étape 1 — Confirmation email au patient

**Fichier à créer** : `apps/frontend/src/app/api/bookings/route.ts` (ajout à l'existant)

Après création réussie du booking, envoyer un email de confirmation via un service d'email transactionnel. Pour le MVP, utiliser `fetch` vers une API email simple.

**Option recommandée** : utiliser `resend` (librairie légère, 100 emails/jour gratuits).

```bash
pnpm --filter frontend add resend
```

```typescript
// Dans POST /api/bookings, après la création :
if (email) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dr Tabibi <rdv@dr-tabibi.ma>',
        to: email,
        subject: 'Confirmation de votre rendez-vous',
        html: `
          <h2>Rendez-vous confirmé</h2>
          <p>Bonjour ${name},</p>
          <p>Votre rendez-vous est confirmé le <strong>${slotDate.toLocaleDateString('fr-FR')}</strong> à <strong>${slotDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>.</p>
          <p>À bientôt !</p>
        `,
      }),
    })
  } catch {} // silencieux si email down
}
```

## Étape 2 — Annulation par le patient

**Fichier à créer** : `apps/frontend/src/app/api/bookings/cancel/route.ts`

Endpoint GET (lien cliquable dans l'email) :

```typescript
export async function GET(request: NextRequest) {
  const bookingUid = request.nextUrl.searchParams.get('uid')
  if (!bookingUid) return NextResponse.json({ error: 'UID manquant' }, { status: 400 })

  // Mettre à jour le booking
  const res = await fetch(`${CMS_URL}/api/calbookings?where[bookingUid][equals]=${bookingUid}&depth=0&limit=1`)
  const data = await res.json()
  const booking = data.docs?.[0]
  if (!booking) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })

  await fetch(`${CMS_URL}/api/calbookings/${booking.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  return new NextResponse('Votre rendez-vous a été annulé.', { status: 200 })
}
```

Ajouter le lien d'annulation dans l'email de confirmation.

## Étape 3 — Rappel 24h avant

**Fichier à créer** : `apps/frontend/src/app/api/cron/send-reminders/route.ts`

Endpoint appelé par un cron job (Vercel Cron ou Coolify Cron) :

```typescript
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0))
  const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999))

  // Trouver les bookings de demain
  const res = await fetch(
    `${CMS_URL}/api/calbookings?where[status][equals]=accepted&where[startTime][greater_than_equal]=${tomorrowStart.toISOString()}&where[startTime][less_than_equal]=${tomorrowEnd.toISOString()}&depth=0&limit=100`
  )
  const data = await res.json()

  for (const booking of (data.docs ?? [])) {
    if (!booking.attendeeEmail) continue
    // Envoyer email de rappel (même pattern que confirmation)
  }

  return NextResponse.json({ reminded: data.docs?.length ?? 0 })
}
```

## Étape 4 — Notification SMS (optionnel)

Pour les patients qui ont un numéro de téléphone, envoyer un SMS de rappel via l'API Twilio ou une API marocaine (Orange, Maroc Telecom).

À ajouter uniquement si le besoin est confirmé par un client.

## Étape 5 — Reporter un RDV (patient)

Même pattern que l'annulation : lien dans l'email → page de report → sélection nouveau créneau → PATCH.

## Étape 6 — Annuler par le médecin (dashboard)

Bouton "Annuler" dans le BookingListView du dashboard, accessible au médecin :

```tsx
// Dans BookingListView, ajouter un bouton pour le médecin (mode dashboard)
<button onClick={async () => {
  await fetch(`/api/cms-proxy/calbookings/${booking.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Annulé par le cabinet' }),
  })
  window.location.reload()
}} className="text-xs text-red-500 hover:text-red-700">
  Annuler
</button>
```

## Étape 7 — Statistiques "Présence aux RDV"

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx`

Remplir le placeholder actuel avec de vraies données :

```typescript
// Calculer le taux de présence
const totalBookings = bookings.filter(b => b.status !== 'cancelled').length + bookings.filter(b => b.status === 'cancelled').length
const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
const attendanceRate = totalBookings > 0 ? Math.round(((totalBookings - cancelledBookings) / totalBookings) * 100) : null
```

Passer `attendanceRate` à `ActivityView` et afficher le pourcentage.

## Fichiers Phase 3

| Action | Fichier |
|--------|---------|
| Modifier | `apps/frontend/src/app/api/bookings/route.ts` (+ confirmation email) |
| Créer | `apps/frontend/src/app/api/bookings/cancel/route.ts` |
| Créer | `apps/frontend/src/app/api/cron/send-reminders/route.ts` |
| Modifier | `apps/frontend/src/components/dashboard/BookingListView.tsx` (+ bouton annuler médecin) |
| Modifier | `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx` (+ attendanceRate) |
| Modifier | `apps/frontend/src/components/dashboard/ActivityView.tsx` (remplacer placeholder) |
