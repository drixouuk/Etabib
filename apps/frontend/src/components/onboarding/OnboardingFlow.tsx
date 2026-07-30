'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowRight, CheckCircle, ClipboardList, Loader2, Minus, Plus, ArrowLeft } from 'lucide-react'
import TierCard from './TierCard'
import SignupForm from './SignupForm'

import { calculateCabinetPrice } from '@/lib/pricing'
import { SUPPORT_EMAIL } from '@/lib/brand'

type TierDef = { slug: string; name: string; price: number; features: string[]; badge?: string }

const tiers: TierDef[] = [
  {
    slug: 'vitrine',
    name: 'Vitrine',
    price: 0,
    features: [
      'Site vitrine personnalisé',
      '4 langues (fr/en/ar/tzm)',
      'Design responsive',
      'Hébergement inclus',
      'Nom de domaine personnalisé',
    ],
  },
  {
    slug: 'rdv',
    name: 'RDV',
    price: 199,
    features: [
      'Tout Vitrine +',
      'Prise de rendez-vous en ligne',
      'Agenda synchronisé',
      'Notifications automatiques',
    ],
  },
  {
    slug: 'cabinet',
    name: 'Cabinet',
    price: 499,
    features: [
      'Tout RDV +',
      'Dossier patient numérique',
      "File d'attente",
      'Consultation + Ordonnance',
      'Carnet vaccinal',
      'Courbes de croissance',
      'Multi-praticiens',
      "Registre d'audit",
      'Statistiques avancées',
      'Support prioritaire',
    ],
  },
]

type SuccessData = { domain: string; email: string }

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors duration-200'
const labelClass = 'mb-1 block text-sm font-medium text-stone-700'

export default function OnboardingFlow() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan')
  const preselected = plan && ['vitrine', 'rdv', 'cabinet'].includes(plan) ? plan : null

  const [selectedTier, setSelectedTier] = useState<string | null>(preselected)
  const [selectedSpecialty, setSelectedSpecialty] = useState('generaliste')
  const [doctorCount, setDoctorCount] = useState(1)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  // Contact form (cabinet)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  const isSelfService = selectedTier === 'vitrine' || selectedTier === 'rdv'
  const isContact = selectedTier === 'cabinet'
  const cabinetPrice = selectedTier === 'cabinet' ? calculateCabinetPrice(doctorCount) : 0

  const selected = tiers.find((t) => t.slug === selectedTier)

  const handleTierClick = (slug: string) => {
    setSelectedTier(slug)
    setDoctorCount(1)
    setSuccess(null)
    router.push(`/onboarding?plan=${slug}`)
  }

  const handleChangePlan = () => {
    setSelectedTier(null)
    setSuccess(null)
    router.push('/onboarding')
  }

  const handleSignupSuccess = (data: SuccessData) => {
    setSuccess(data)
  }

  const specialtyLabel = (s: string) => {
    const labels: Record<string, string> = { pediatrie: 'Pédiatrie', generaliste: 'Médecine générale', gynecologie: 'Gynécologie', dermatologie: 'Dermatologie', autre: 'Autre' }
    return labels[s] || s
  }

  // === SUCCESS PAGE ===
  if (success && selected && isSelfService) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <CheckCircle className="mx-auto size-16 text-success-500" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-stone-800">
          Votre cabinet est prêt !
        </h2>
        <p className="mt-2 text-stone-500">
          Votre site est accessible à l'adresse :
        </p>
        <a href={`https://${success.domain}`} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-block text-lg font-medium text-primary-600 hover:text-primary-700 underline">
          https://{success.domain}
        </a>
        <div className="mt-8 space-y-3">
          <Link href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 transition-colors duration-200">
            Accéder à mon espace <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-8 rounded-lg bg-stone-50 p-6 text-left">
          <h3 className="font-heading text-sm font-semibold text-stone-700">Prochaines étapes :</h3>
          <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-stone-600">
            <li>Personnalisez votre site vitrine depuis votre espace</li>
            <li>Ajoutez vos informations de contact, horaires, services</li>
            {selectedTier === 'rdv' && <li>Configurez vos disponibilités en ligne</li>}
          </ol>
        </div>
      </div>
    )
  }

  // === CONTACT SENT (cabinet) ===
  if (success && isContact && contactSent) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <ClipboardList className="mx-auto size-16 text-primary-500" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-stone-800">Demande envoyée</h2>
        <p className="mt-2 text-stone-500">
          Merci pour votre intérêt pour la formule <strong>{selected?.name}</strong> !
        </p>
        <p className="mt-4 text-stone-500">
          Nous vous contacterons dans les 48h pour organiser une démo et configurer votre espace.
        </p>
        <p className="mt-4 text-sm text-stone-400">
          En attendant, vous pouvez nous écrire à :{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary-600 hover:text-primary-700 underline">{SUPPORT_EMAIL}</a>
        </p>
        <button onClick={handleChangePlan}
          className="mt-8 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200">
          Choisir une autre formule
        </button>
      </div>
    )
  }

  // === NO PLAN SELECTED → show tier grid ===
  if (!selectedTier) {
    return (
      <div>
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-stone-800">
            Créer votre espace professionnel
          </h1>
          <p className="mt-2 text-stone-500">
            Choisissez la formule adaptée à votre activité
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <TierCard
              key={t.slug}
              slug={t.slug}
              name={t.name}
              price={t.price}
              features={t.features}
              badge={t.badge}
              ctaLabel={t.slug === 'cabinet' ? 'Sélectionner' : 'Commencer'}
              ctaVariant={t.slug === 'cabinet' ? 'outline' : 'primary'}
              isActive={false}
              onClick={() => handleTierClick(t.slug)}
            />
          ))}
        </div>
      </div>
    )
  }

  // === PLAN SELECTED → show form ===
  return (
    <div>
      <button onClick={handleChangePlan}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors duration-200">
        <ArrowLeft className="size-4" /> Choisir une autre formule
      </button>

      <div className="mb-6 rounded-xl border border-primary-200 bg-primary-50 p-4 text-center">
        <p className="text-sm font-medium text-primary-700">
          Formule {selected?.name}
          {selected && (selected.price === 0 ? ' — Gratuite' : ` — ${selected.price} MAD/mois`)}
        </p>
      </div>

      {selectedTier === 'vitrine' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm text-amber-800">
            Ajoutez la prise de RDV en ligne pour 199 MAD/mois —{' '}
            <Link href="/onboarding?plan=rdv" className="font-semibold underline hover:text-amber-900">
              Voir la formule RDV
            </Link>
          </p>
        </div>
      )}

      {isSelfService && !success && (
        <div className="mx-auto max-w-lg space-y-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Votre spécialité</label>
              <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className={inputClass}>
                <option value="pediatrie">Pédiatrie</option>
                <option value="generaliste">Médecine générale</option>
                <option value="gynecologie">Gynécologie</option>
                <option value="dermatologie">Dermatologie</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <SignupForm
            tier={selectedTier as 'vitrine' | 'rdv' | 'cabinet'}
            specialty={selectedSpecialty}
            doctorCount={undefined}
            onSuccess={handleSignupSuccess}
            onBack={() => {}}
          />
        </div>
      )}

      {/* Cabinet contact form */}
      {isContact && !success && !contactSent && (
        <div className="mx-auto max-w-md">
          <h2 className="font-heading text-xl font-bold text-stone-800 text-center">Demander une démo</h2>
          <p className="mt-2 text-sm text-stone-500 text-center">
            Laissez-nous vos coordonnées, nous vous recontactons sous 48h.
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault(); setContactSending(true)
            try {
              await fetch('/api/contact', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: contactName.trim(), phone: contactPhone.trim(),
                  message: `Demande de démo — Formule ${selected?.name} — Spécialité ${specialtyLabel(selectedSpecialty)} — Email : ${contactEmail.trim()}`,
                }),
              })
              setContactSent(true)
              setSuccess({ domain: '', email: contactEmail })
            } catch {}
            setContactSending(false)
          }} className="mt-6 space-y-4">
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              placeholder="Votre nom" required className={inputClass} />
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              placeholder="Téléphone" type="tel" required className={inputClass} />
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              placeholder="Email" type="email" required className={inputClass} />
            <button type="submit" disabled={contactSending}
              className="w-full rounded-lg bg-primary-700 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {contactSending ? 'Envoi…' : 'Envoyer ma demande'}
            </button>
          </form>
        </div>
      )}

      {contactSent && isContact && success && !success.domain && (
        <div className="mx-auto max-w-lg text-center">
          <ClipboardList className="mx-auto size-16 text-primary-500" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-stone-800">Demande envoyée</h2>
          <p className="mt-2 text-stone-500">
            Merci pour votre intérêt pour la formule <strong>{selected?.name}</strong> !
          </p>
          <p className="mt-4 text-stone-500">
            Nous vous contacterons dans les 48h pour organiser une démo et configurer votre espace.
          </p>
          <p className="mt-4 text-sm text-stone-400">
            En attendant, vous pouvez nous écrire à :{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary-600 hover:text-primary-700 underline">{SUPPORT_EMAIL}</a>
          </p>
          <button onClick={handleChangePlan}
            className="mt-8 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200">
            Choisir une autre formule
          </button>
        </div>
      )}
    </div>
  )
}
