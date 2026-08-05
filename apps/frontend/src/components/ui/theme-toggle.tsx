'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

/**
 * Bascule clair/sombre — DashboardShell UNIQUEMENT (décision assumée : la
 * landing SaaS, les vitrines et le login restent volontairement en light
 * pour l'instant ; le dark a de la valeur sur la surface de travail du
 * cabinet, utilisée toute la journée).
 *
 * Préférence système par défaut, choix utilisateur persisté (next-themes),
 * aucun flash au rechargement. Le focus ring suit les tokens A5.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations('theme')

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0"
      aria-label={t('toggleLabel')}
      title={t('toggleLabel')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
