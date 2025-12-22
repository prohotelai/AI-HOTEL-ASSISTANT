'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Building2 } from 'lucide-react'

/**
 * Hotel Setup Recovery Page
 * 
 * For admins whose accounts exist but are not linked to a hotel (LEGACY RECOVERY).
 * 
 * SCENARIO:
 * - Admin account created before hotel.name was required
 * - Hotel exists but has no name (or empty name)
 * - Onboarding wizard blocks access with error
 * - This page provides ONE-TIME setup of hotel name
 * - After completion, redirect to onboarding wizard
 * 
 * CRITICAL: This should ONLY appear for legacy accounts with missing hotel names
 * New signups MUST collect hotel name at signup time (cannot reach this page)
 */
export default function SetupHotelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hotelName, setHotelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'create' | 'success'>('create')

  // Redirect authenticated users with hotels THAT HAVE NAMES back to dashboard
  if (status === 'authenticated' && (session?.user as any)?.hotelId) {
    // This is a safety redirect - users with properly set up hotels
    // should never reach this page
    router.push('/dashboard')
    return null
  }

  // Redirect unauthenticated users to login
  if (status === 'unauthenticated') {
    router.push('/admin/login')
    return null
  }

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!hotelName.trim() || hotelName.trim().length < 2) {
        throw new Error('Hotel name must be at least 2 characters')
      }

      // Call API to create/link hotel
      const res = await fetch('/api/admin/setup-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelName: hotelName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create hotel')
      }

      // Success - show confirmation
      setStep('success')
      
      // Redirect to onboarding after brief delay
      setTimeout(() => {
        router.push('/admin/onboarding')
      }, 2000)
    } catch (error: any) {
      console.error('Hotel setup error:', error)
      setError(error.message || 'Failed to create hotel. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Hotel Created!
          </h2>
          <p className="text-gray-600 mb-6">
            Your hotel &quot;{hotelName}&quot; has been created successfully. 
            You&apos;ll be redirected to onboarding in a moment...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Complete Hotel Setup
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Your account needs a hotel name to continue with onboarding.
            This is a one-time setup and cannot be changed later.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleCreateHotel} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hotel Name *
            </label>
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="e.g., Sunset Beach Resort"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
              minLength={2}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ This name is permanent and cannot be changed after you save it.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !hotelName.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up hotel...' : 'Continue to Onboarding'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center mb-3">
            Or sign out and try again
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
