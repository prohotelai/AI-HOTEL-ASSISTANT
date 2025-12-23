/**
 * /admin/setup-wizard
 * 
 * NEW AI Setup Wizard (4 Steps)
 * - Step 1: Hotel Information
 * - Step 2: Web Scan (automatic)
 * - Step 3: Knowledge Base Review
 * - Step 4: Test AI & Complete
 * 
 * Features:
 * - Persistent state (stored on Hotel model)
 * - Resumable across refresh, back button, new tab
 * - Redirects if wizard already completed
 * - Shows progress bar
 * - Mobile responsive
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WizardState {
  status: 'IN_PROGRESS' | 'COMPLETED' | null
  step: 1 | 2 | 3 | 4 | null
  completedAt: Date | null
}

export default function SetupWizardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [wizardState, setWizardState] = useState<WizardState | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hotelId = (session?.user as any)?.hotelId as string | null

  // Load wizard progress on mount
  const loadWizardProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/wizard/progress', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`Failed to load wizard: ${res.status}`)
      }

      const state: WizardState = await res.json()
      setWizardState(state)

      // CRITICAL: If wizard is COMPLETED, redirect to dashboard
      if (state.status === 'COMPLETED') {
        router.replace('/admin/dashboard')
        return
      }

      // Resume from current step
      if (state.step) {
        setCurrentStep(state.step)
      } else {
        setCurrentStep(1)
      }

      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load wizard')
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.replace('/admin/login')
      return
    }

    if (!hotelId) {
      setError('Hotel context missing. Please contact support.')
      setLoading(false)
      return
    }

    loadWizardProgress()
  }, [session, status, hotelId, router, loadWizardProgress])

  async function handleNextStep(stepData?: any) {
    if (!hotelId) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/wizard/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_step',
          step: currentStep,
          data: stepData,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update wizard')
      }

      const newState: WizardState = await res.json()
      setWizardState(newState)

      // If wizard completed, redirect
      if (newState.status === 'COMPLETED') {
        router.replace('/admin/dashboard')
        return
      }

      // Move to next step
      if (newState.step) {
        setCurrentStep(newState.step)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update wizard')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Setup Wizard...</p>
        </div>
      </div>
    )
  }

  if (!session?.user || !hotelId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the setup wizard.</p>
          <Button className="mt-4" onClick={() => router.push('/admin/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Set Up Your AI Hotel Assistant
          </h1>
          <p className="text-gray-600">
            Complete these steps to activate AI and unlock full dashboard access
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of 4
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / 4) * 100)}%
              </span>
            </div>
            <Progress value={(currentStep / 4) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Tell Us About Your Hotel'}
              {currentStep === 2 && 'Scan Your Website'}
              {currentStep === 3 && 'Review Your Knowledge Base'}
              {currentStep === 4 && 'Test & Train AI'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                'Help us understand your hotel and its unique offerings.'}
              {currentStep === 2 &&
                'We\'ll automatically scan your website to extract key information.'}
              {currentStep === 3 &&
                'Review what we found and add any missing information.'}
              {currentStep === 4 &&
                'Chat with AI to verify it has the right information.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Hotel Info */}
            {currentStep === 1 && (
              <Step1Content onNext={handleNextStep} isLoading={submitting} />
            )}

            {/* Step 2: Web Scan */}
            {currentStep === 2 && (
              <Step2Content onNext={handleNextStep} isLoading={submitting} />
            )}

            {/* Step 3: Knowledge Review */}
            {currentStep === 3 && (
              <Step3Content onNext={handleNextStep} isLoading={submitting} />
            )}

            {/* Step 4: Test AI */}
            {currentStep === 4 && (
              <Step4Content
                onComplete={handleNextStep}
                isLoading={submitting}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-3 justify-between">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {currentStep < 4 && (
            <Button
              onClick={() => handleNextStep()}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Step Indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full transition-colors ${
                step < currentStep
                  ? 'bg-green-500'
                  : step === currentStep
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Step Components

function Step1Content({
  onNext,
  isLoading,
}: {
  onNext: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    hotelName: '',
    country: '',
    city: '',
    hotelType: 'Hotel',
    websiteUrl: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hotel Name *
        </label>
        <input
          type="text"
          required
          value={formData.hotelName}
          onChange={(e) =>
            setFormData({ ...formData, hotelName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., The Grand Plaza Hotel"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          <input
            type="text"
            required
            value={formData.country}
            onChange={(e) =>
              setFormData({ ...formData, country: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., United States"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., New York"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hotel Type *
        </label>
        <select
          value={formData.hotelType}
          onChange={(e) =>
            setFormData({ ...formData, hotelType: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>Hotel</option>
          <option>Boutique</option>
          <option>Aparthotel</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website URL (Optional)
        </label>
        <input
          type="url"
          value={formData.websiteUrl}
          onChange={(e) =>
            setFormData({ ...formData, websiteUrl: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., https://example.com"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Loading...' : 'Continue'}
      </Button>
    </form>
  )
}

function Step2Content({
  onNext,
  isLoading,
}: {
  onNext: (data: any) => void
  isLoading: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Scanning your website...</p>
        <p className="text-sm text-gray-500 mt-2">
          This usually takes 30-60 seconds
        </p>
      </div>

      <Alert>
        <AlertDescription>
          We&apos;ll extract your amenities, services, FAQs, and brand tone to teach the AI
          about your hotel.
        </AlertDescription>
      </Alert>

      <Button
        onClick={() => onNext({ scannedData: 'website scan complete' })}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Scanning...' : 'Done - Continue'}
      </Button>
    </div>
  )
}

function Step3Content({
  onNext,
  isLoading,
}: {
  onNext: (data: any) => void
  isLoading: boolean
}) {
  const [knowledge, setKnowledge] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext({ knowledge })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Add or Edit Knowledge
        </label>
        <textarea
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          placeholder="Paste information about your hotel, policies, amenities, FAQs, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 font-mono text-sm"
        />
      </div>

      <Alert>
        <AlertDescription>
          The more detailed information you provide, the better the AI can answer guest
          questions.
        </AlertDescription>
      </Alert>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Confirm & Continue'}
      </Button>
    </form>
  )
}

function Step4Content({
  onComplete,
  isLoading,
}: {
  onComplete: (data: any) => void
  isLoading: boolean
}) {
  const [messages, setMessages] = useState<
    { role: string; content: string }[]
  >([])
  const [input, setInput] = useState('')

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    setInput('')

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        role: 'assistant',
        content:
          'Great question! I found that information in your knowledge base. Let me provide you with a detailed answer.',
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-md p-4 h-64 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Start a conversation with the AI to test it!
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block px-3 py-2 rounded-lg max-w-xs ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask the AI about your hotel..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={handleSend} disabled={isLoading}>
          Send
        </Button>
      </div>

      <Button
        onClick={() => onComplete({ testQuestions: 1, feedbackGiven: 0 })}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isLoading ? 'Completing...' : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Complete & Go to Dashboard
          </>
        )}
      </Button>
    </div>
  )
}

