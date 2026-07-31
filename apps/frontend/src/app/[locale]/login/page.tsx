'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Activity, Check, ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'

const DEMO_EMAIL = 'drdemo@gmail.com'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemoHost = searchParams.get('demo') === 'true' || (typeof window !== 'undefined' && window.location.hostname.startsWith('drdemo.'))
  const [isDemo, setIsDemo] = useState(isDemoHost)
  const [doctorName, setDoctorName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [email, setEmail] = useState(isDemoHost ? DEMO_EMAIL : '')

  useEffect(() => {
    fetch('/api/practice/me')
      .then(r => r.json())
      .then(d => {
        if (d?.doctorName) setDoctorName(d.doctorName)
        if (d?.specialty) setSpecialty(d.specialty)
        if (d?.city) setCity(d.city)
        if (d?.isDemo) setIsDemo(true)
      })
      .catch(() => {})
  }, [])

  const brandName = doctorName || (isDemo ? 'Dr Demo' : 'Etabib')
  const brandSubtitle = [specialty, city].filter(Boolean).join(' · ')

  // Demo request form
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [demoName, setDemoName] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [demoMessage, setDemoMessage] = useState('')
  const [demoSending, setDemoSending] = useState(false)
  const [demoSent, setDemoSent] = useState(false)
  const [demoError, setDemoError] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const handleDemoRequest = async (e: FormEvent) => {
    e.preventDefault()
    setDemoError('')
    setDemoSending(true)
    try {
      const res = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: demoName.trim(), email: demoEmail.trim(), message: demoMessage.trim() }),
      })
      if (res.ok) {
        setDemoSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setDemoError(data?.error || 'Erreur lors de l\'envoi. Réessayez.')
      }
    } catch {
      setDemoError('Impossible de contacter le serveur.')
    }
    setDemoSending(false)
  }

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-800 to-primary-600 p-[44px_52px] text-white max-md:p-[26px_24px] max-md:flex-row max-md:items-center max-md:justify-between max-md:min-h-auto">
        <span className="absolute size-[380px] rounded-full bg-white/8 -top-[140px] -right-[120px] max-md:hidden" />
        <span className="absolute size-[280px] rounded-full bg-white/6 -bottom-[100px] -left-[80px] max-md:hidden" />

        <Link href="/" className="relative z-1 flex items-center gap-[10px] font-heading font-bold text-[1.05rem]">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-white/15">
            <Activity className="size-[18px]" />
          </span>
          {brandName}
        </Link>

        <div className="relative z-1 max-w-[400px] max-md:hidden">
          <h2 className="text-white font-heading font-extrabold text-[clamp(1.5rem,2.4vw,2rem)] mb-[26px] leading-tight">
            La santé de vos enfants, entre de bonnes mains
          </h2>
          <ul className="flex flex-col gap-[14px] list-none">
            <li className="flex items-center gap-[11px] text-[.95rem] text-white/90">
              <Check className="size-[18px] bg-white/18 rounded-full p-[3px] shrink-0" />
              Dossier patient centralisé
            </li>
            <li className="flex items-center gap-[11px] text-[.95rem] text-white/90">
              <Check className="size-[18px] bg-white/18 rounded-full p-[3px] shrink-0" />
              Agenda synchronisé avec le site
            </li>
            <li className="flex items-center gap-[11px] text-[.95rem] text-white/90">
              <Check className="size-[18px] bg-white/18 rounded-full p-[3px] shrink-0" />
              Carnet vaccinal & courbes de croissance
            </li>
          </ul>
        </div>

        {brandSubtitle && <p className="relative z-1 text-[.86rem] text-white/70 max-md:hidden">{brandSubtitle}</p>}
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-cream-100 p-10 max-md:p-[36px_24px]">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="inline-flex items-center gap-[7px] text-[.87rem] font-semibold text-stone-500 hover:text-primary-700 mb-7">
            <ArrowLeft className="size-[15px]" />
            Retour au site
          </Link>

          <h1 className="font-heading text-[1.6rem] font-extrabold text-stone-800 mb-1.5">Espace Praticien</h1>
          <p className="text-[.92rem] text-stone-500 mb-[30px]">Connectez-vous pour accéder à votre cabinet</p>

          <div className={`flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-[.86rem] font-semibold p-[11px_13px] rounded-[10px] mb-4 ${error ? 'flex' : 'hidden'}`}>
            <AlertCircle className="size-4 shrink-0" />
            {error || 'Email ou mot de passe incorrect'}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <label htmlFor="email" className="block text-[.85rem] font-semibold text-stone-800 mb-[7px]">Email</label>
              <div className="input-wrap">
                <input
                  id="email" name="email" type="email" required autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-[11px] border border-stone-200 bg-white px-[14px] py-3 text-[.94rem] text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:shadow-[0_0_0_3.5px_rgba(13,148,136,.14)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mb-[18px]">
              <label htmlFor="password" className="block text-[.85rem] font-semibold text-stone-800 mb-[7px]">Mot de passe</label>
              <div className="input-wrap relative">
                <input
                  id="password" name="password" type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-[11px] border border-stone-200 bg-white px-[14px] py-3 pr-10 text-[.94rem] text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:shadow-[0_0_0_3.5px_rgba(13,148,136,.14)] focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-[11px] top-1/2 -translate-y-1/2 flex items-center justify-center size-[26px] text-stone-500 bg-transparent border-none cursor-pointer" aria-label="Afficher le mot de passe">
                  {showPwd ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end mb-[22px]">
              <Link href="/mot-de-passe-oublie" className="text-[.85rem] font-semibold text-primary-700 hover:underline">Mot de passe oublié ?</Link>
            </div>

            <button type="submit" disabled={loading} className={`w-full rounded-[11px] bg-primary-700 py-[13px] font-bold text-[.95rem] text-white flex items-center justify-center gap-2 transition-colors hover:bg-primary-800 active:scale-[.99] ${loading ? 'pointer-events-none' : ''}`}>
              {loading ? (
                <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Se connecter'
              )}
              {!loading && <ArrowRight className="size-[17px]" />}
            </button>
          </form>

          {/* Demo access request — visible uniquement sur la démo */}
          {isDemo && (
          <div className="mt-6 border-t border-stone-200 pt-5">
            {!demoSent ? (
              <>
                <button
                  onClick={() => setShowDemoForm(!showDemoForm)}
                  className="inline-flex items-center gap-1.5 text-[.85rem] font-semibold text-stone-600 hover:text-primary-700 transition-colors"
                >
                  <ChevronDown className={`size-3.5 transition-transform duration-200 ${showDemoForm ? 'rotate-180' : ''}`} />
                  {isDemo ? "Vous n'avez pas le mot de passe ?" : "Demander un accès démo"}
                </button>

                {showDemoForm && (
                  <form onSubmit={handleDemoRequest} className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Votre nom"
                      value={demoName}
                      onChange={e => setDemoName(e.target.value)}
                      required
                      className="w-full rounded-[11px] border border-stone-200 bg-white px-[14px] py-2.5 text-[.88rem] text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:shadow-[0_0_0_3.5px_rgba(13,148,136,.14)] focus:outline-none transition-colors"
                    />
                    <input
                      type="email"
                      placeholder="Votre email professionnel"
                      value={demoEmail}
                      onChange={e => setDemoEmail(e.target.value)}
                      required
                      className="w-full rounded-[11px] border border-stone-200 bg-white px-[14px] py-2.5 text-[.88rem] text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:shadow-[0_0_0_3.5px_rgba(13,148,136,.14)] focus:outline-none transition-colors"
                    />
                    <textarea
                      placeholder="Message (optionnel)"
                      value={demoMessage}
                      onChange={e => setDemoMessage(e.target.value)}
                      rows={2}
                      className="w-full rounded-[11px] border border-stone-200 bg-white px-[14px] py-2.5 text-[.88rem] text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:shadow-[0_0_0_3.5px_rgba(13,148,136,.14)] focus:outline-none transition-colors resize-none"
                    />
                    {demoError && (
                      <p className="text-[.82rem] text-red-600 font-medium">{demoError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={demoSending}
                      className="w-full rounded-[11px] border border-primary-300 bg-white py-[11px] text-[.88rem] font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50"
                    >
                      {demoSending ? 'Envoi…' : 'Demander l\'accès'}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-primary-50 border border-primary-200 p-4 text-center">
                <Check className="size-8 text-primary-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-primary-800">Demande envoyée</p>
                <p className="text-xs text-primary-600 mt-1">
                  Vous recevrez les identifiants par email après validation.
                </p>
              </div>
            )}
          </div>
          )}

          <p className="mt-[36px] text-center text-[.78rem] text-stone-500">&copy; {new Date().getFullYear()} {brandName}</p>
        </div>
        </div>
      </main>
  )
}
