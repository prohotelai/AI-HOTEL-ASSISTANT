/**
 * AI Hotel Onboarding Wizard - Main Entry Point
 * Route: /dashboard/onboarding
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'
import WelcomeStep from '@/components/onboarding/steps/WelcomeStep'
import ProfileStep from '@/components/onboarding/steps/ProfileStep'
import WebsiteScanStep from '@/components/onboarding/steps/WebsiteScanStep'
import KnowledgeBaseStep from '@/components/onboarding/steps/KnowledgeBaseStep'
import WidgetStep from '@/components/onboarding/steps/WidgetStep'
import IntegrationsStep from '@/components/onboarding/steps/IntegrationsStep'
import InviteStaffStep from '@/components/onboarding/steps/InviteStaffStep'
import TestChatStep from '@/components/onboarding/steps/TestChatStep'
import FinishStep from '@/components/onboarding/steps/FinishStep'
import { Loader2 } from 'lucide-react'

interface OnboardingProgress {
  currentStep: string
  stepsCompleted: string[]
  isCompleted: boolean
  fastTrackMode: boolean
}

export default function OnboardingWizard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [stepStartTime, setStepStartTime] = useState(Date.now())

  const hotelId = session?.user?.hotelId as string

  const fetchProgress = useCallback(async () => {
    if (!hotelId) return

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/progress`)
      if (res.ok) {
        const data = await res.json()
        setProgress(data)
      }
    } catch (error) {
      console.error('Failed to fetch onboarding progress:', error)
    } finally {
      setLoading(false)
    }
  }, [hotelId])

  useEffect(() => {
    void fetchProgress()
  }, [fetchProgress])

  async function handleStepComplete(step: string) {
    if (!hotelId) return

    const timeSpent = Math.floor((Date.now() - stepStartTime) / 1000)

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedStep: step,
          timeSpent,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setProgress(updated)
        setStepStartTime(Date.now())
      }
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  async function handleStepChange(step: string) {
    if (!hotelId || !progress) return

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStep: step,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setProgress(updated)
        setStepStartTime(Date.now())
      }
    } catch (error) {
      console.error('Failed to change step:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-brand-text mb-2">
            Unable to load onboarding
          </h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-brand-primary hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (progress.currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            onComplete={() => handleStepComplete('welcome')}
            onNext={() => handleStepChange('profile')}
          />
        )
      case 'profile':
        return (
          <ProfileStep
            onComplete={() => handleStepComplete('profile')}
            onNext={() => handleStepChange('website-scan')}
            onBack={() => handleStepChange('welcome')}
          />
        )
      case 'website-scan':
        return (
          <WebsiteScanStep
            hotelId={hotelId}
            onComplete={() => handleStepComplete('website-scan')}
            onNext={() => handleStepChange('knowledge-base')}
            onBack={() => handleStepChange('profile')}
          />
        )
      case 'knowledge-base':
        return (
          <KnowledgeBaseStep
            hotelId={hotelId}
            onComplete={() => handleStepComplete('knowledge-base')}
            onNext={() => handleStepChange('widget')}
            onBack={() => handleStepChange('website-scan')}
          />
        )
      case 'widget':
        return (
          <WidgetStep
            hotelId={hotelId}
            onComplete={() => handleStepComplete('widget')}
            onNext={() => handleStepChange('integrations')}
            onBack={() => handleStepChange('knowledge-base')}
          />
        )
      case 'integrations':
        return (
          <IntegrationsStep
            hotelId={hotelId}
            onComplete={() => handleStepComplete('integrations')}
            onNext={() => handleStepChange('invite-staff')}
            onBack={() => handleStepChange('widget')}
          />
        )
      case 'invite-staff':
        return (
          <InviteStaffStep
            hotelId={hotelId}
            onComplete={() => handleStepComplete('invite-staff')}
            onNext={() => handleStepChange('test')}
            onBack={() => handleStepChange('integrations')}
          />
        )
      case 'test':
        return (
          <TestChatStep
            hotelId={hotelId}
            onComplete={() => handleStepComplete('test')}
            onNext={() => handleStepChange('finish')}
            onBack={() => handleStepChange('invite-staff')}
          />
        )
      case 'finish':
        return <FinishStep hotelId={hotelId} />
      default:
        return <WelcomeStep onComplete={() => handleStepComplete('welcome')} onNext={() => handleStepChange('profile')} />
    }
  }

  return (
    <OnboardingLayout
      currentStep={progress.currentStep}
      completedSteps={progress.stepsCompleted}
      onStepChange={handleStepChange}
    >
      {renderStep()}
    </OnboardingLayout>
  )
}
