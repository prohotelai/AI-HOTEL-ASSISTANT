'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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

export const dynamic = 'force-dynamic'

type OnboardingStep =
  | 'welcome'
  | 'profile'
  | 'website-scan'
  | 'knowledge-base'
  | 'widget'
  | 'integrations'
  | 'invite-staff'
  | 'test'
  | 'finish'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/owner-login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      const user = session.user as any

      // If user already completed onboarding, redirect to dashboard
      if (user.hotelId && user.onboardingCompleted) {
        router.push('/dashboard')
        return
      }

      // If user is not OWNER, redirect to appropriate page
      if (user.role !== 'OWNER' && user.role !== 'owner') {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }
  }, [session, status, router])

  const handleStepComplete = (step: string) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  const handleNext = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'profile',
      'website-scan',
      'knowledge-base',
      'widget',
      'integrations',
      'invite-staff',
      'test',
      'finish',
    ]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'profile',
      'website-scan',
      'knowledge-base',
      'widget',
      'integrations',
      'invite-staff',
      'test',
      'finish',
    ]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleStepChange = (step: string) => {
    setCurrentStep(step as OnboardingStep)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepChange={handleStepChange}
    >
      {currentStep === 'welcome' && (
        <WelcomeStep
          onComplete={() => handleStepComplete('welcome')}
          onNext={handleNext}
        />
      )}
      {currentStep === 'profile' && (
        <ProfileStep
          onComplete={() => handleStepComplete('profile')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'website-scan' && (
        <WebsiteScanStep
          onComplete={() => handleStepComplete('website-scan')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'knowledge-base' && (
        <KnowledgeBaseStep
          onComplete={() => handleStepComplete('knowledge-base')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'widget' && (
        <WidgetStep
          onComplete={() => handleStepComplete('widget')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'integrations' && (
        <IntegrationsStep
          onComplete={() => handleStepComplete('integrations')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'invite-staff' && (
        <InviteStaffStep
          onComplete={() => handleStepComplete('invite-staff')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'test' && (
        <TestChatStep
          onComplete={() => handleStepComplete('test')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'finish' && (
        <FinishStep
          onComplete={() => handleStepComplete('finish')}
        />
      )}
    </OnboardingLayout>
  )
}
