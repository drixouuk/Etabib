import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type Props = {
  fullName: string
  gender?: 'boy' | 'girl' | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function PatientAvatar({ fullName, gender, size = 'md', className = '' }: Props) {
  const bgColor =
    gender === 'girl' ? 'bg-avatar-girl' :
    gender === 'boy' ? 'bg-avatar-boy' :
    'bg-muted'

  return (
    <Avatar className={`${SIZE_CLASSES[size]} ${bgColor} ${className}`}>
      <AvatarFallback className="bg-transparent text-foreground font-bold">
        {getInitials(fullName)}
      </AvatarFallback>
    </Avatar>
  )
}
