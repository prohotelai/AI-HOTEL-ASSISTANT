'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'
import HotelDetailsStep from '@/components/onboarding/steps/HotelDetailsStep'
import RoomConfigStep from '@/components/onboarding/steps/RoomConfigStep'
import ServicesSetupStep from '@/components/onboarding/steps/ServicesSetupStep'
import FinishStep from '@/components/onboarding/steps/FinishStep'

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

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('hotel-details')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [hotelData, setHotelData] = useState<HotelData | null>(null)
  const [loadError, setLoadError] = useState('')
  
  // Get hotelId and role from session (requires authentication)
  const hotelId = (session?.user as any)?.hotelId as string | null
  const userRole = (session?.user as any)?.role as string | null
  const onboardingCompleted = (session?.user as any)?.onboardingCompleted as boolean | null

  // Load hotel data and validate access
  useEffect(() => {
    // Check authentication status
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/admin/login')
      return
    }

    // Validate session data
    if (status === 'authenticated' && session?.user) {
      // Enforce OWNER role - only hotel admin owners can access
      if (userRole !== 'OWNER' && userRole !== 'owner') {
        console.warn(`Unauthorized onboarding access: user role is ${userRole}, requires OWNER`)
        router.push('/403')
        return
      }

      // Redirect if already completed onboarding
      if (onboardingCompleted) {
        router.push('/dashboard')
        return
      }

      // Validate hotelId exists in auth context
      if (!hotelId) {
        console.error('Critical Error: User authenticated but hotelId missing from session')
        setLoadError('Your hotel account is incomplete. Please contact support.')
        return
      }

      // Load hotel data using hotelId from auth context
      loadHotelData(hotelId)
    }
  }, [session, status, hotelId, userRole, onboardingCompleted, router])

  /**
   * Load hotel data from server (bound to authenticated user's hotelId)
   * This ensures we never ask for hotel name again - it's already created at signup
   */
  async function loadHotelData(hotelId: string) {
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
      
      // Validate hotel object has required name field - CRITICAL CHECK
      if (!data || !data.id) {
        console.error('Invalid hotel data received:', data)
        throw new Error('Hotel setup is incomplete. Please contact support.')
      }

      // CRITICAL: Hotel MUST have a name - it's set at signup time
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        console.error('Hotel missing required name field:', { hotelId: data.id, name: data.name })
        throw new Error('Hotel setup is incomplete. Hotel name is missing. Please contact support.')
      }

      setHotelData(data)
    } catch (error: any) {
      console.error('Failed to load hotel data:', error)
      setLoadError(error.message || 'Failed to load hotel data')
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = (step: string) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  const handleNext = () => {
    const steps: OnboardingStep[] = [
      'hotel-details',
      'room-config',
      'services-setup',
      'finish',
    ]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: OnboardingStep[] = [
      'hotel-details',
      'room-config',
      'services-setup',
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
  if (loadError || !hotelData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Error</h2>
          <p className="text-gray-600 mb-6">
            {loadError || 'Unable to load your hotel data. Please refresh the page.'}
          </p>
          <button
            onClick={() => router.push('/admin/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Login
          </button>
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
      {currentStep === 'hotel-details' && hotelData && (
        <HotelDetailsStep
          hotelData={hotelData}
          onComplete={() => handleStepComplete('hotel-details')}
          onNext={handleNext}
        />
      )}
      {currentStep === 'room-config' && hotelData && (
        <RoomConfigStep
          hotelId={hotelData.id}
          onComplete={() => handleStepComplete('room-config')}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'services-setup' && hotelData && (
        <ServicesSetupStep
          hotelId={hotelData.id}
          onComplete={() => handleStepComplete('services-setup')}
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
