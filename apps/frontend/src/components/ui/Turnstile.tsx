'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
    }
  }
}

export type TurnstileHandle = { reset: () => void }

// Site key publique (env override possible) ; le SECRET ne vit que côté serveur (TURNSTILE_SECRET)
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEFInDufXOGG0uH-'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_ID = 'cf-turnstile-api'
const ACTION = 'turnstile-spin-v2'

function loadApiScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(SCRIPT_ID)) {
      if (window.turnstile) {
        resolve()
        return
      }
      const check = setInterval(() => {
        if (window.turnstile) {
          clearInterval(check)
          resolve()
        }
      }, 100)
      return
    }
    const s = document.createElement('script')
    s.id = SCRIPT_ID
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

type Props = {
  onTokenChange: (token: string | null) => void
}

const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile({ onTokenChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const tokenCbRef = useRef(onTokenChange)
  tokenCbRef.current = onTokenChange

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile || widgetId.current) return
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      action: ACTION,
      callback: (token: string) => tokenCbRef.current(token),
      'expired-callback': () => {
        tokenCbRef.current(null)
        window.turnstile?.reset(widgetId.current ?? undefined)
      },
      'error-callback': () => tokenCbRef.current(null),
    })
  }

  useImperativeHandle(ref, () => ({
    reset: () => {
      tokenCbRef.current(null)
      window.turnstile?.reset(widgetId.current ?? undefined)
    },
  }), [])

  useEffect(() => {
    let mounted = true
    loadApiScript().then(() => {
      if (mounted) renderWidget()
    })
    return () => {
      mounted = false
    }
  }, [])

  return <div ref={containerRef} className="cf-turnstile" data-action={ACTION} />
})

export default Turnstile
