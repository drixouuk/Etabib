'use client'

import { formatTimeInput } from '@/lib/datetime'

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  'aria-label'?: string
}

/**
 * Saisie d'heure libre avec normalisation au blur (Phase B — B2).
 * Accepte 0930 / 930 / 09.30 / 9,30 / 9h30 / 9 am (chiffres arabes inclus) ;
 * le blur normalise en HH:MM quand c'est parseable, sinon la saisie reste
 * telle quelle (la validation de formulaire la rejettera).
 */
export function TimeInput({ value, onChange, className, disabled, placeholder = '09:30', ...rest }: Props) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const normalized = formatTimeInput(e.target.value)
        if (normalized) onChange(normalized)
      }}
      className={className}
      {...rest}
    />
  )
}
