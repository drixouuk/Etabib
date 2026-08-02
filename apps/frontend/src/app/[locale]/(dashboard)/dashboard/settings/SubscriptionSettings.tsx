'use client'

import { Calendar, CreditCard, Users } from 'lucide-react'
import type { Subscription } from '@/lib/subscription'

const STATUS_INFO: Record<string, { label: string; badge: string; message: string }> = {
  trialing: { label: 'Essai gratuit', badge: 'bg-primary-50 text-primary-700', message: 'Votre essai gratuit est en cours. Aucun paiement requis jusqu’à la fin de la période.' },
  active: { label: 'Actif', badge: 'bg-success/10 text-success', message: 'Votre abonnement est à jour.' },
  past_due: { label: 'Paiement en retard', badge: 'bg-warning/10 text-warning', message: 'Votre paiement est en retard. Votre espace reste accessible, régularisez avant la fin du délai.' },
  grace: { label: 'Lecture seule', badge: 'bg-error/10 text-error', message: 'Paiement en retard : votre espace est en lecture seule. Régularisez pour retrouver toutes les fonctionnalités.' },
  suspended: { label: 'Suspendu', badge: 'bg-error/10 text-error', message: 'Votre abonnement est suspendu. Vos données sont conservées — contactez-nous pour restaurer votre espace.' },
  expired: { label: 'Expiré', badge: 'bg-stone-100 text-stone-600', message: 'Votre abonnement est expiré. Vos données sont conservées — contactez-nous pour reprendre.' },
  canceled: { label: 'Résilié', badge: 'bg-stone-100 text-stone-600', message: 'Votre abonnement a été résilié. Vos données sont conservées.' },
}

const tierLabels: Record<string, string> = { vitrine: 'Site vitrine', rdv: 'RDV en ligne', cabinet: 'Cabinet' }

type Props = {
  subscription: Subscription | null
}

export default function SubscriptionSettings({ subscription }: Props) {
  const status = subscription?.status || 'active'
  const info = STATUS_INFO[status] || STATUS_INFO.active
  const blocked = ['suspended', 'expired'].includes(status)
  const readOnly = status === 'grace'

  if (!subscription) {
    return (
      <div className="rounded-xl border border-warm bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-600">Aucun abonnement configuré pour ce cabinet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warm bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-600">Plan actuel</p>
            <p className="font-heading text-xl font-bold text-stone-800">{tierLabels[subscription.plan] || subscription.plan}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${info.badge}`}>{info.label}</span>
        </div>
        <p className="mt-3 text-sm text-stone-600">{info.message}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
          <CreditCard className="size-4 text-primary-700" />
          <p className="mt-2 text-xs text-stone-600">Montant mensuel</p>
          <p className="font-heading text-lg font-bold text-stone-800">{subscription.amount || 0} MAD</p>
        </div>
        <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
          <Users className="size-4 text-primary-700" />
          <p className="mt-2 text-xs text-stone-600">Médecins inclus</p>
          <p className="font-heading text-lg font-bold text-stone-800">{subscription.seats || 1}</p>
        </div>
        <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
          <Calendar className="size-4 text-primary-700" />
          <p className="mt-2 text-xs text-stone-600">Fin de cycle</p>
          <p className="font-heading text-lg font-bold text-stone-800">
            {subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>
      </div>

      {subscription.lastPaymentAt && (
        <p className="text-xs text-stone-500">
          Dernier paiement : {new Date(subscription.lastPaymentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      <a
        href="mailto:contact@etabibi.ma?subject=Gestion de ma facturation"
        className="inline-block rounded-[10px] border border-primary-600/20 bg-white px-4 py-2.5 text-[13.5px] text-stone-800 transition-colors hover:bg-primary-50"
      >
        Gérer la facturation
      </a>

      {(blocked || readOnly) && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-4">
          <p className="text-sm font-medium text-stone-800">Pour régulariser</p>
          <p className="mt-1 text-sm text-stone-600">
            Contactez le support par email à <a className="font-medium text-primary-700" href="mailto:contact@etabibi.ma">contact@etabibi.ma</a> pour organiser le paiement (virement ou carte).
          </p>
        </div>
      )}
    </div>
  )
}
