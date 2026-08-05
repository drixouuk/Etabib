import { requireAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { getTenantById } from '@/lib/payload'
import { getSubscriptionByTenant, isBlocked, isReadOnly, type SubscriptionStatus } from '@/lib/subscription'
import { Calendar, CreditCard, Users } from 'lucide-react'

const STATUS_INFO: Record<SubscriptionStatus, { label: string; badge: string; message: string }> = {
  trialing: { label: 'Essai gratuit', badge: 'bg-primary/10 text-primary-700', message: 'Votre essai gratuit est en cours. Aucun paiement requis jusqu’à la fin de la période.' },
  active: { label: 'Actif', badge: 'bg-success/10 text-success', message: 'Votre abonnement est à jour.' },
  past_due: { label: 'Paiement en retard', badge: 'bg-warning/10 text-warning', message: 'Votre paiement est en retard. Votre espace reste accessible, régularisez avant la fin du délai.' },
  grace: { label: 'Lecture seule', badge: 'bg-error/10 text-error', message: 'Paiement en retard : votre espace est en lecture seule. Régularisez pour retrouver toutes les fonctionnalités.' },
  suspended: { label: 'Suspendu', badge: 'bg-error/10 text-error', message: 'Votre abonnement est suspendu. Vos données sont conservées — contactez-nous pour restaurer votre espace.' },
  expired: { label: 'Expiré', badge: 'bg-accent text-muted-foreground', message: 'Votre abonnement est expiré. Vos données sont conservées — contactez-nous pour reprendre.' },
  canceled: { label: 'Résilié', badge: 'bg-accent text-muted-foreground', message: 'Votre abonnement a été résilié. Vos données sont conservées.' },
}

export default async function BillingPage() {
  const user = await requireAuth()
  const tenantId = getTenantId(user)
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const subscription = tenantId ? await getSubscriptionByTenant(tenantId) : null

  const status = subscription?.status || 'active'
  const info = STATUS_INFO[status] || STATUS_INFO.active
  const tierLabels: Record<string, string> = { vitrine: 'Site vitrine', rdv: 'RDV en ligne', cabinet: 'Cabinet' }
  const blocked = isBlocked(status)
  const readOnly = isReadOnly(status)

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">Abonnement</h1>
      <p className="mt-1 text-sm text-muted-foreground capitalize">{tenant?.name || 'Votre cabinet'}</p>

      {subscription ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Plan actuel</p>
                <p className="font-heading text-xl font-bold text-foreground">{tierLabels[subscription.plan] || subscription.plan}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${info.badge}`}>{info.label}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{info.message}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <CreditCard className="size-4 text-primary-700" />
              <p className="mt-2 text-xs text-muted-foreground">Montant mensuel</p>
              <p className="font-heading text-lg font-bold text-foreground">{subscription.amount || 0} MAD</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <Users className="size-4 text-primary-700" />
              <p className="mt-2 text-xs text-muted-foreground">Médecins inclus</p>
              <p className="font-heading text-lg font-bold text-foreground">{subscription.seats || 1}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <Calendar className="size-4 text-primary-700" />
              <p className="mt-2 text-xs text-muted-foreground">Fin de cycle</p>
              <p className="font-heading text-lg font-bold text-foreground">
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>

          {subscription.lastPaymentAt && (
            <p className="text-xs text-muted-foreground">
              Dernier paiement : {new Date(subscription.lastPaymentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          {(blocked || readOnly) && (
            <div className="rounded-xl border border-error/20 bg-error/5 p-4">
              <p className="text-sm font-medium text-foreground">Pour régulariser</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contactez le support par email à <a className="font-medium text-primary-700" href="mailto:contact@etabibi.ma">contact@etabibi.ma</a> pour organiser le paiement (virement ou carte).
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Aucun abonnement configuré pour ce cabinet.</p>
        </div>
      )}
    </div>
  )
}
