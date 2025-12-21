'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Hotel } from 'lucide-react'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<'welcome' | 'hotel-setup' | 'complete'>('welcome')
  const [hotelName, setHotelName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      const user = session.user as any
      
      // If user already has a hotel and completed onboarding, redirect to dashboard
      if (user.hotelId && user.onboardingCompleted) {
        router.push('/dashboard')
        return
      }

      // If user is not OWNER role, redirect to appropriate page
      if (user.role !== 'OWNER' && user.role !== 'owner') {
        router.push('/dashboard')
        return
      }
    }
  }, [session, status, router])

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Create hotel slug from name
      const slug = hotelName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const response = await fetch('/api/onboarding/create-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelName, slug }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create hotel')
      }

      const data = await response.json()
      
      // Mark onboarding as complete
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: data.hotel.id }),
      })

      setStep('complete')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh() // Force session refresh
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {step === 'welcome' && (
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <Hotel className="h-16 w-16 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to AI Hotel Assistant!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Let&apos;s set up your hotel in just a few steps.
            </p>
            <button
              onClick={() => setStep('hotel-setup')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 'hotel-setup' && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="flex justify-center mb-6">
              <Hotel className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Create Your Hotel
            </h2>
            
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateHotel} className="space-y-6">
              <div>
                <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Name
                </label>
                <input
                  id="hotelName"
                  type="text"
                  required
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Grand Palace Hotel"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !hotelName.trim()}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Hotel'}
              </button>
            </form>
          </div>
        )}

        {step === 'complete' && (
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 p-4">
                <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              All Set!
            </h2>
            <p className="text-gray-600 mb-6">
              Your hotel has been created successfully. Redirecting to dashboard...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  )
}
