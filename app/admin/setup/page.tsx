'use client'

// Force dynamic rendering (no SSR/prerendering)
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, CheckCircle2, Circle, ArrowRight } from 'lucide-react'

interface WizardState {
  status: 'IN_PROGRESS' | 'COMPLETED' | null
  step: 1 | 2 | 3 | 4 | null
  completedAt: Date | null
}

/**
 * Admin Setup Wizard Page
 * 
 * PURPOSE:
 * - First-time setup after signup
 * - Resumable if interrupted
 * - Accessible later from admin dashboard
 * 
 * FLOW:
 * - Signup → /admin/setup (automatic)
 * - Complete wizard → /admin (dashboard)
 * - Later: Admin dashboard → "Setup Wizard" link → /admin/setup
 * 
 * WIZARD STEPS:
 * 1. Hotel Information (name, location, type)
 * 2. Website Scan (automatic knowledge extraction)
 * 3. Knowledge Review & Enrichment
 * 4. AI Testing & Validation
 */

interface Step {
  number: number
  title: string
  description: string
  completed: boolean
  current: boolean
}

export default function AdminSetupWizardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [hotelName, setHotelName] = useState<string>('')
  const [wizardState, setWizardState] = useState<WizardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Extract hotel info from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any
      setHotelId(user.hotelId || null)
      setHotelName(user.hotelName || '')
    }
  }, [session])

  // Debug logging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🧙 WIZARD PAGE LOADED')
      console.log('Hotel ID:', hotelId)
      console.log('Hotel Name:', hotelName)
    }
  }, [hotelId, hotelName])

  // Load wizard state
  useEffect(() => {
    async function loadWizardState() {
      if (!hotelId) return

      try {
        setLoading(true)
        const response = await fetch(`/api/wizard/state?hotelId=${hotelId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch wizard state')
        }
        
        const state = await response.json()
        
        console.log('📊 WIZARD STATE:', state)
        
        // If wizard completed, redirect to dashboard
        if (state?.status === 'COMPLETED') {
          console.log('✅ Wizard already completed, redirecting to dashboard')
          router.push('/dashboard/admin')
          return
        }

        setWizardState(state)
      } catch (err) {
        console.error('Failed to load wizard state:', err)
        setError('Failed to load setup wizard. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadWizardState()
  }, [hotelId, router])

  // Handle step completion
  const handleStepComplete = async (stepNumber: number) => {
    if (!hotelId) {
      console.error('❌ No hotelId available')
      setError('Missing hotel information. Please try refreshing the page.')
      return
    }

    if (submitting) {
      console.log('⏳ Already submitting, ignoring click')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
      console.log(`🚀 Completing step ${stepNumber}...`, {
        hotelId,
        hotelName,
        step: stepNumber
      })

      // Call API to complete step
      const response = await fetch('/api/wizard/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepNumber,
          data: stepNumber === 1 ? {
            hotelName: hotelName || 'Unknown Hotel',
            country: '',
            city: '',
            hotelType: 'Hotel'
          } : stepNumber === 3 ? {
            knowledge: '',
            confirmedItems: []
          } : stepNumber === 4 ? {
            testQuestions: [],
            feedbackGiven: 0
          } : undefined
        })
      })

      console.log('📥 API Response:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || `Failed to complete step (${response.status})`)
      }

      const result = await response.json()
      console.log('✅ Step completed:', result)
      
      // If step 4 completed, redirect to dashboard
      if (stepNumber === 4 || result.status === 'COMPLETED') {
        console.log('🎉 Wizard completed! Redirecting to dashboard...')
        router.push('/dashboard/admin')
        return
      }

      // Reload wizard state
      console.log('🔄 Reloading wizard state...')
      const stateResponse = await fetch(`/api/wizard/state?hotelId=${hotelId}`)
      const updatedState = await stateResponse.json()
      console.log('📊 Updated state:', updatedState)
      setWizardState(updatedState)
    } catch (err) {
      console.error('❌ Failed to complete step:', err)
      setError(err instanceof Error ? err.message : 'Failed to save progress. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Render loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-300">Loading setup wizard...</p>
        </div>
      </div>
    )
  }

  // Check authentication
  if (status === 'unauthenticated') {
    router.push('/admin/login')
    return null
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentStep = wizardState?.step || 1
  
  const steps: Step[] = [
    {
      number: 1,
      title: 'Hotel Information',
      description: 'Tell us about your hotel',
      completed: currentStep > 1,
      current: currentStep === 1,
    },
    {
      number: 2,
      title: 'Website Scan',
      description: 'Auto-extract knowledge from your website',
      completed: currentStep > 2,
      current: currentStep === 2,
    },
    {
      number: 3,
      title: 'Review Knowledge',
      description: 'Confirm and enrich AI knowledge',
      completed: currentStep > 3,
      current: currentStep === 3,
    },
    {
      number: 4,
      title: 'Test AI Assistant',
      description: 'Try it out and build confidence',
      completed: currentStep > 4,
      current: currentStep === 4,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to AI Hotel Assistant</h1>
          <p className="text-slate-400">Let&apos;s set up your AI assistant in 4 simple steps</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-700" />
              )}

              <div className="flex items-start gap-4">
                {/* Step Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-600' 
                    : step.current 
                    ? 'bg-blue-600' 
                    : 'bg-slate-800'
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Circle className={`w-6 h-6 ${step.current ? 'text-white' : 'text-slate-600'}`} />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold ${
                    step.current ? 'text-white' : 'text-slate-400'
                  }`}>
                    Step {step.number}: {step.title}
                  </h3>
                  <p className="text-slate-500 mt-1">{step.description}</p>

                  {/* Step Action */}
                  {step.current && (
                    <div className="mt-4 p-6 bg-slate-900 border border-slate-700 rounded-lg">
                      <WizardStepContent
                        step={step.number}
                        hotelId={hotelId}
                        hotelName={hotelName || ''}
                        onComplete={() => handleStepComplete(step.number)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Skip for Now Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="text-slate-400 hover:text-slate-300 underline"
          >
            Skip setup for now (you can complete it later)
          </button>
        </div>
      </div>
    </div>
  )
}

// Step-specific content components
function WizardStepContent({ 
  step, 
  hotelId, 
  hotelName, 
  onComplete 
}: { 
  step: number
  hotelId: string | null
  hotelName: string
  onComplete: () => void 
}) {
  switch (step) {
    case 1:
      return <Step1HotelInfo hotelName={hotelName} onComplete={onComplete} />
    case 2:
      return <Step2WebsiteScan onComplete={onComplete} />
    case 3:
      return <Step3ReviewKnowledge onComplete={onComplete} />
    case 4:
      return <Step4TestAI onComplete={onComplete} />
    default:
      return null
  }
}

function Step1HotelInfo({ hotelName, onComplete }: { hotelName: string; onComplete: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    setIsSubmitting(true)
    await onComplete()
    setIsSubmitting(false)
  }

  return (
    <div>
      <h4 className="text-white font-semibold mb-4">Your Hotel Information</h4>
      <p className="text-slate-400 mb-6">
        We already have your hotel name: <strong className="text-white">{hotelName || '(Not set)'}</strong>
      </p>
      <button
        onClick={handleClick}
        disabled={isSubmitting}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Continue to Next Step
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}

function Step2WebsiteScan({ onComplete }: { onComplete: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    setIsSubmitting(true)
    await onComplete()
    setIsSubmitting(false)
  }

  return (
    <div>
      <h4 className="text-white font-semibold mb-4">Website Scan (Coming Soon)</h4>
      <p className="text-slate-400 mb-6">
        We&apos;ll automatically extract information from your website to train the AI.
      </p>
      <button
        onClick={handleClick}
        disabled={isSubmitting}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Skip This Step for Now
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}

function Step3ReviewKnowledge({ onComplete }: { onComplete: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    setIsSubmitting(true)
    await onComplete()
    setIsSubmitting(false)
  }

  return (
    <div>
      <h4 className="text-white font-semibold mb-4">Review Knowledge (Coming Soon)</h4>
      <p className="text-slate-400 mb-6">
        Review and enrich the AI&apos;s knowledge about your hotel.
      </p>
      <button
        onClick={handleClick}
        disabled={isSubmitting}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Skip This Step for Now
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}

function Step4TestAI({ onComplete }: { onComplete: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    setIsSubmitting(true)
    await onComplete()
    setIsSubmitting(false)
  }

  return (
    <div>
      <h4 className="text-white font-semibold mb-4">Test Your AI Assistant (Coming Soon)</h4>
      <p className="text-slate-400 mb-6">
        Try asking questions to see how the AI will respond to your guests.
      </p>
      <button
        onClick={handleClick}
        disabled={isSubmitting}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Completing...
          </>
        ) : (
          <>
            Complete Setup
            <CheckCircle2 className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}
