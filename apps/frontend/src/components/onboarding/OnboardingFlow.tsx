'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { ArrowRight, CheckCircle, ClipboardList, Minus, Plus } from 'lucide-react'
import StepIndicator from './StepIndicator'
import TierCard from './TierCard'
import SignupForm from './SignupForm'

import { calculateCabinetPrice } from '@/lib/invoiceninja'

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
      'Prise de rendez-vous en ligne (Cal.com)',
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

const steps = [
  { label: 'Formule' },
  { label: 'Inscription' },
  { label: 'Confirmation' },
]

type SuccessData = { domain: string; email: string }

export default function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState('generaliste')
  const [doctorCount, setDoctorCount] = useState(1)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  // Contact form (#3)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  const isSelfService = selectedTier === 'vitrine' || selectedTier === 'rdv'
  const isContact = selectedTier === 'cabinet'
  const cabinetPrice = selectedTier === 'cabinet' ? calculateCabinetPrice(doctorCount) : 0

  const handleTierClick = (slug: string) => {
    setSelectedTier(slug)
    setDoctorCount(1)
  }

  const handleContinue = () => {
    if (selectedTier === 'cabinet') {
      setStep(2)
    } else {
      setStep(1)
    }
  }

  const handleSignupSuccess = (data: SuccessData) => {
    setSuccess(data)
    setStep(2)
  }

  const specialtyLabel = (s: string) => {
    const labels: Record<string, string> = { pediatrie: 'Pédiatrie', generaliste: 'Médecine générale', gynecologie: 'Gynécologie', dermatologie: 'Dermatologie', autre: 'Autre' }
    return labels[s] || s
  }

  const selected = tiers.find((t) => t.slug === selectedTier)

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

      <StepIndicator steps={steps} current={step} />

      {step === 0 && (
        <>
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
                isActive={selectedTier === t.slug}
                onClick={() => handleTierClick(t.slug)}
              />
            ))}
          </div>

          {selectedTier && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="w-full max-w-xs">
                <label className="mb-1 block text-sm font-medium text-stone-700">Votre spécialité</label>
                <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none">
                  <option value="pediatrie">Pédiatrie</option>
                  <option value="generaliste">Médecine générale</option>
                  <option value="gynecologie">Gynécologie</option>
                  <option value="dermatologie">Dermatologie</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              {selectedTier === 'cabinet' && (
                <div className="w-full max-w-xs">
                  <label className="mb-1 block text-sm font-medium text-stone-700">Nombre de médecins</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setDoctorCount(Math.max(1, doctorCount - 1))}
                      className="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors duration-200">
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-[3ch] text-center text-lg font-semibold text-stone-800">{doctorCount}</span>
                    <button type="button" onClick={() => setDoctorCount(doctorCount + 1)}
                      className="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors duration-200">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-stone-400">À partir de 499 MAD/mois · +199 MAD/mois par médecin supplémentaire</p>
                  <p className="mt-1 text-sm font-semibold text-primary-700">Total : {cabinetPrice} MAD/mois</p>
                </div>
              )}
              <button onClick={handleContinue}
                className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 transition-colors duration-200">
                Continuer
              </button>
            </div>
          )}
        </>
      )}

      {step === 1 && selected && isSelfService && (
        <div>
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
              {selected.name} — {selected.price === 0 ? 'Gratuit' : `${selected.price} MAD/mois`}
            </span>
          </div>
          <SignupForm
            tier={selected.slug as 'vitrine' | 'rdv' | 'cabinet'}
            specialty={selectedSpecialty}
            doctorCount={selected.slug === 'cabinet' ? doctorCount : undefined}
            onSuccess={handleSignupSuccess}
            onBack={() => setStep(0)}
          />
        </div>
      )}

      {step === 2 && isSelfService && success && (
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
              {selectedTier === 'rdv' && <li>Configurez vos disponibilités dans Cal.com</li>}
            </ol>
          </div>
        </div>
      )}

      {/* #3 — Formulaire de contact pour dossier/clinique */}
      {step === 2 && isContact && selected && !contactSent && (
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
              {selected.name} — {selected.slug === 'cabinet' ? cabinetPrice : selected.price} MAD/mois{selected.slug === 'cabinet' && doctorCount > 1 && ` (${doctorCount} médecins)`}
            </span>
            <span className="ml-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
              {specialtyLabel(selectedSpecialty)}
            </span>
          </div>
          <h2 className="font-heading text-xl font-bold text-stone-800 text-center">Demander une démo</h2>
          <p className="mt-2 text-sm text-stone-500 text-center">
            Laissez-nous vos coordonnées, nous vous recontacterons sous 48h.
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault(); setContactSending(true)
            try {
              await fetch('/api/contact', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: contactName.trim(), phone: contactPhone.trim(),
                  message: `Demande de démo — Formule ${selected.name} — Spécialité ${specialtyLabel(selectedSpecialty)} — Email : ${contactEmail.trim()}`,
                }),
              })
              setContactSent(true)
            } catch {}
            setContactSending(false)
          }} className="mt-6 space-y-4">
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              placeholder="Votre nom" required
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              placeholder="Téléphone" type="tel" required
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              placeholder="Email" type="email" required
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
            <button type="submit" disabled={contactSending}
              className="w-full rounded-lg bg-primary-700 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {contactSending ? 'Envoi…' : 'Envoyer ma demande'}
            </button>
          </form>
          <button onClick={() => { setStep(0); setSelectedTier(null) }}
            className="mt-4 w-full text-sm text-stone-500 hover:text-stone-700">
            Choisir une autre formule
          </button>
        </div>
      )}

      {step === 2 && isContact && contactSent && (
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
            <a href="mailto:contact@dr-tabibi.ma" className="text-primary-600 hover:text-primary-700 underline">contact@dr-tabibi.ma</a>
          </p>
          <button onClick={() => { setStep(0); setSelectedTier(null); setContactSent(false) }}
            className="mt-8 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200">
            Choisir une autre formule
          </button>
        </div>
      )}
    </div>
  )
}
