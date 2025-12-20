'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

/**
 * 403 Forbidden - Access Denied Page
 * 
 * Shown when user lacks required permissions or roles to access a resource
 */
export default function AccessDeniedPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [countdown, setCountdown] = useState(5)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Auto-redirect to dashboard after countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      router.push('/dashboard')
    }
  }, [countdown, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 4v2M9 3H5a2 2 0 00-2 2v4m0 0H3m0 0v4a2 2 0 002 2h4m0 0h0m0 0v4a2 2 0 002 2h4m0 0h4a2 2 0 002-2v-4m0 0h2m0 0v-4a2 2 0 00-2-2h-4"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access this resource. Your current role or
            permissions are insufficient for this action.
          </p>
        </div>

        {/* User Info */}
        {session?.user && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Logged in as:</p>
            <p className="font-semibold text-gray-900">{session.user.email}</p>
            <p className="text-sm text-gray-600 mt-2">Role: {session.user.role}</p>
          </div>
        )}

        {/* What you can do */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">What you can do:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Contact your administrator for access</li>
            <li>• Try a different action within your permissions</li>
            <li>• Return to your dashboard</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.back()}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Go Back
          </button>
        </div>

        {/* Auto-redirect notice */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Redirecting to dashboard in {countdown} seconds...
          </p>
        </div>
      </div>
    </div>
  )
}
