'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowRight, CheckCircle, Minus, Plus, ArrowLeft } from 'lucide-react'
import SignupForm from './SignupForm'

import { calculateCabinetPrice } from '@/lib/pricing'

type TierDef = { slug: string; name: string; price: number; features: string[]; badge?: string }

const tiers: TierDef[] = [
  {
    slug: 'vitrine', name: 'Vitrine', price: 0,
    features: ['Site vitrine personnalisé', '4 langues (fr/en/ar/tzm)', 'Design responsive', 'Hébergement inclus', 'Nom de domaine personnalisé'],
  },
  {
    slug: 'rdv', name: 'RDV', price: 199,
    features: ['Tout Vitrine +', 'Prise de rendez-vous en ligne', 'Agenda synchronisé', 'Notifications automatiques'],
  },
  {
    slug: 'cabinet', name: 'Cabinet', price: 499,
    features: ['Tout RDV +', 'Dossier patient numérique', "File d'attente", 'Consultation + Ordonnance', 'Carnet vaccinal', 'Courbes de croissance', 'Multi-praticiens', "Registre d'audit", 'Statistiques avancées', 'Support prioritaire'],
  },
]

type SuccessData = { domain: string; email: string }

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors duration-200'
const labelClass = 'mb-1 block text-sm font-medium text-stone-700'

export default function OnboardingFlow() {
  const t = useTranslations('onboarding')
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan')
  const preselected = plan && ['vitrine', 'rdv', 'cabinet'].includes(plan) ? plan : null

  const [selectedTier, setSelectedTier] = useState<string | null>(preselected)
  const [selectedSpecialty, setSelectedSpecialty] = useState('generaliste')
  const [doctorCount, setDoctorCount] = useState(1)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  const cabinetPrice = selectedTier === 'cabinet' ? calculateCabinetPrice(doctorCount) : 0
  const selected = tiers.find((t) => t.slug === selectedTier)

  const handleChangePlan = () => {
    setSelectedTier(null)
    setSuccess(null)
    router.push('/landing')
  }

  const handleSignupSuccess = (data: SuccessData) => {
    setSuccess(data)
  }

  if (success && selected) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <CheckCircle className="mx-auto size-16 text-success-500" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-stone-800">{t('successTitle')}</h2>
        <p className="mt-2 text-stone-500">{t('successSiteAddress')}</p>
        <a href={`https://${success.domain}`} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-block text-lg font-medium text-primary-600 hover:text-primary-700 underline">https://{success.domain}</a>
        <div className="mt-8 space-y-3">
          <Link href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 transition-colors duration-200">
            {t('successAccessSpace')} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-8 rounded-lg bg-stone-50 p-6 text-left">
          <h3 className="font-heading text-sm font-semibold text-stone-700">{t('successNextSteps')}</h3>
          <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-stone-600">
            <li>{t('successStep1')}</li>
            <li>{t('successStep2')}</li>
            {selectedTier !== 'vitrine' && <li>{t('successStep3')}</li>}
          </ol>
        </div>
      </div>
    )
  }

  if (!selectedTier) {
    return null
  }

  return (
    <div>
      <button onClick={handleChangePlan}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors duration-200">
        <ArrowLeft className="size-4" /> {t('changePlan')}
      </button>

      <div className="mb-6 rounded-xl border border-primary-200 bg-primary-50 p-4 text-center">
        <p className="text-sm font-medium text-primary-700">
          {selected && selected.price === 0
            ? t('selectedPlanGratuite', { plan: selected.name })
            : t('selectedPlanMois', { plan: selected?.name ?? '', price: selected?.price ?? 0 })}
        </p>
      </div>

      {selectedTier === 'vitrine' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm text-amber-800">
            {t('upsellVitrine')}{' — '}
            <Link href="/onboarding?plan=rdv" className="font-semibold underline hover:text-amber-900">{t('upsellVitrineCTA')}</Link>
          </p>
        </div>
      )}

      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <label className={labelClass}>{t('selectSpecialtyLabel')}</label>
          <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className={inputClass}>
            <option value="pediatrie">Pédiatrie</option>
            <option value="generaliste">Médecine générale</option>
            <option value="gynecologie">Gynécologie</option>
            <option value="dermatologie">Dermatologie</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {selectedTier === 'cabinet' && (
          <div>
            <label className={labelClass}>{t('doctorCountLabel')}</label>
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
            <p className="mt-2 text-xs text-stone-400">{t('doctorCountHint')}</p>
            <p className="mt-1 text-sm font-semibold text-primary-700">{t('totalPrice', { price: cabinetPrice })}</p>
          </div>
        )}

        <SignupForm
          tier={selectedTier as 'vitrine' | 'rdv' | 'cabinet'}
          specialty={selectedSpecialty}
          doctorCount={selectedTier === 'cabinet' ? doctorCount : undefined}
          onSuccess={handleSignupSuccess}
          onBack={handleChangePlan}
        />
      </div>
    </div>
  )
}
