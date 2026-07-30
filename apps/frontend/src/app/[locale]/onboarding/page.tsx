import { Suspense } from 'react'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:py-24">
      <Suspense fallback={null}>
        <OnboardingFlow />
      </Suspense>
    </div>
  )
}
