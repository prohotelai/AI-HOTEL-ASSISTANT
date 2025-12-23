'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'
import HotelDetailsStep from '@/components/onboarding/steps/HotelDetailsStep'
import RoomConfigStep from '@/components/onboarding/steps/RoomConfigStep'
import ServicesSetupStep from '@/components/onboarding/steps/ServicesSetupStep'
import FinishStep from '@/components/onboarding/steps/FinishStep'
import type { OnboardingProgressData } from '@/lib/services/onboarding/onboardingStepService'

export const dynamic = 'force-dynamic'

export interface HotelData {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
}

type OnboardingStep = 'hotel-details' | 'room-config' | 'services-setup' | 'finish'

const STEP_ORDER: OnboardingStep[] = [
  'hotel-details',
  'room-config',
  'services-setup',
  'finish',
]

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Server-side state - loaded from API
  const [progress, setProgress] = useState<OnboardingProgressData | null>(null)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('hotel-details')
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [hotelData, setHotelData] = useState<HotelData | null>(null)
  const [loadError, setLoadError] = useState('')
  
  // Get hotelId and role from session
  const hotelId = (session?.user as any)?.hotelId as string | null
  const userRole = (session?.user as any)?.role as string | null

  // Load onboarding progress from server
  const loadProgress = useCallback(async (hotelId: string) => {
    try {
      const res = await fetch('/api/onboarding/progress', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`Failed to load progress: ${res.status}`)
      }

      const data: OnboardingProgressData = await res.json()
      setProgress(data)

      // CRITICAL: If registration is COMPLETED, redirect to dashboard immediately
      if (data.status === 'COMPLETED') {
        console.log('✅ Registration completed - redirecting to dashboard')
        router.replace('/admin/dashboard')
        return null
      }

      // Determine which step to show - use currentStep from server or first incomplete step
      const resumeStep = (data.currentStep || STEP_ORDER[0]) as OnboardingStep
      setCurrentStep(resumeStep)

      return data
    } catch (error: any) {
      console.error('Failed to load onboarding progress:', error)
      setLoadError(error.message)
      return null
    }
  }, [router])

  // Load hotel data
  const loadHotelData = useCallback(async (hotelId: string) => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(`Failed to load hotel data: ${error.error || res.status}`)
      }

      const data = await res.json()

      if (!data || !data.id || !data.name) {
        throw new Error('Hotel setup is incomplete. Please contact support.')
      }

      setHotelData(data)
      return data
    } catch (error: any) {
      console.error('Failed to load hotel data:', error)
      setLoadError(error.message)
      return null
    }
  }, [])

  // Initial load - authenticate, check completion, load progress
  useEffect(() => {
    if (status === 'loading') return

    // Middleware handles authentication redirection
    // If we reach here, user is authenticated (middleware enforced)
    if (status === 'authenticated' && session?.user) {
      // Validate hotelId exists
      if (!hotelId) {
        console.error('Critical Error: User authenticated but hotelId missing')
        setLoadError('Your hotel account is incomplete. Please contact support.')
        setLoading(false)
        return
      }

      // Load both progress and hotel data in parallel
      Promise.all([loadProgress(hotelId), loadHotelData(hotelId)]).then(([prog]) => {
        // loadProgress handles redirect if COMPLETED
        // No need to check here

        setLoading(false)
      })
    }
  }, [session, status, hotelId, loadProgress, loadHotelData])

  // Handle step completion - updates server and stays on wizard
  const handleStepComplete = async (stepName: string) => {
    if (!hotelId) return

    try {
      const stepRoute = `/api/onboarding/steps/${stepName}`
      const res = await fetch(stepRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Individual steps handle their own validation
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('Step completion failed:', error)
        return
      }

      const updated = await res.json()
      setProgress(updated.progress)

      // Move to next step if available
      if (updated.nextStep) {
        setCurrentStep(updated.nextStep as OnboardingStep)
      } else {
        // Wizard is complete
        // Middleware will redirect on next navigation
        // Just show completion message for now
        setProgress({ ...updated.progress, status: 'COMPLETED' })
      }
    } catch (error) {
      console.error('Error completing step:', error)
    }
  }

  // Handle skip step
  const handleSkipStep = async (stepName: string) => {
    if (!hotelId) return

    try {
      const res = await fetch(`/api/onboarding/steps/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepName }),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('Step skip failed:', error)
        return
      }

      const updated = await res.json()
      setProgress(updated.progress)

      // Move to next step
      if (updated.nextStep) {
        setCurrentStep(updated.nextStep as OnboardingStep)
      }
    } catch (error) {
      console.error('Error skipping step:', error)
    }
  }

  // Navigation
  const handleNext = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep)
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1])
    }
  }

  const handleStepChange = (step: string) => {
    setCurrentStep(step as OnboardingStep)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your hotel setup...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError || !hotelData || !progress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Error</h2>
          <p className="text-gray-600 mb-6">
            {loadError || 'Unable to load your hotel data. Please refresh the page.'}
          </p>
          <p className="text-sm text-gray-500">
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={progress.completedSteps}
      skippedSteps={progress.skippedSteps}
      onStepChange={handleStepChange}
    >
      {currentStep === 'hotel-details' && hotelData && (
        <HotelDetailsStep
          hotelData={hotelData}
          onComplete={() => handleStepComplete('hotel-details')}
          onSkip={() => handleSkipStep('hotel-details')}
          onNext={handleNext}
        />
      )}
      {currentStep === 'room-config' && hotelData && (
        <RoomConfigStep
          hotelId={hotelData.id}
          onComplete={() => handleStepComplete('room-config')}
          onSkip={() => handleSkipStep('room-config')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'services-setup' && hotelData && (
        <ServicesSetupStep
          hotelId={hotelData.id}
          onComplete={() => handleStepComplete('services-setup')}
          onSkip={() => handleSkipStep('services-setup')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'finish' && hotelData && (
        <FinishStep
          hotelId={hotelData.id}
          onComplete={() => handleStepComplete('finish')}
        />
      )}
    </OnboardingLayout>
  )
}
