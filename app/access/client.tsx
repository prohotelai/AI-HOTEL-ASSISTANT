'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Smartphone, UserCheck } from 'lucide-react'

export default function AccessPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Support both new format (?qr=...) and legacy format (?hotelId=...)
  const qrCode = searchParams.get('qr')
  const legacyHotelId = searchParams.get('hotelId')

  const [validating, setValidating] = useState(true)
  const [hotel, setHotel] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'guest' | 'staff' | null>(
    null
  )
  const [redirecting, setRedirecting] = useState(false)
  const [isLegacyQr, setIsLegacyQr] = useState(false)

  // Validate hotel exists and has active QR
  useEffect(() => {
    async function validateAccess() {
      // Priority: New QR format first, then legacy hotelId
      if (qrCode) {
        // NEW FORMAT: Validate QR code
        try {
          const res = await fetch('/api/qr/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode })
          })

          if (!res.ok) {
            const errorData = await res.json()
            setError(errorData.error || 'Invalid QR code')
            setValidating(false)
            return
          }

          const data = await res.json()
          setHotel({ id: data.hotelId, name: data.hotelName })
          setValidating(false)
        } catch (error) {
          console.error('QR validation error:', error)
          setError('Failed to validate QR code. Please try again.')
          setValidating(false)
        }
      } else if (legacyHotelId) {
        // LEGACY FORMAT: Direct hotel ID (deprecated but supported)
        setIsLegacyQr(true)
        console.warn('⚠️ Legacy QR format detected (hotelId). Please update to new QR code.')

        try {
          const hotelRes = await fetch(`/api/hotels/${legacyHotelId}`)

          if (!hotelRes.ok) {
            if (hotelRes.status === 404) {
              setError('Hotel not found')
            } else {
              setError('Failed to validate access link')
            }
            setValidating(false)
            return
          }

          const hotelData = await hotelRes.json()
          setHotel(hotelData.hotel)
          setValidating(false)
        } catch (error) {
          console.error('Access validation error:', error)
          setError('Failed to validate access link. Please try again.')
          setValidating(false)
        }
      } else {
        setError('No QR code or hotel ID provided in access link')
        setValidating(false)
      }
    }

    validateAccess()
  }, [qrCode, legacyHotelId])

  const handleGuestAccess = async () => {
    if (!hotel) return

    setRedirecting(true)

    try {
      // Redirect guest to identification page (passport/national ID)
      router.push(`/guest/access?hotelId=${hotel.id}`)
    } catch (error) {
      console.error('Guest access error:', error)
      setError('Failed to access guest access page')
      setRedirecting(false)
    }
  }

  const handleStaffAccess = async () => {
    if (!hotel) return

    setRedirecting(true)

    try {
      // Redirect to staff login with hotel context
      router.push(`/staff/access?hotelId=${hotel.id}`)
    } catch (error) {
      console.error('Staff access error:', error)
      setError('Failed to access staff console')
      setRedirecting(false)
    }
  }

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Validating access link...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back Home
          </button>
        </div>
      </div>
    )
  }

  // Role selection state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        {/* Legacy QR Warning */}
        {isLegacyQr && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900">Legacy QR Code Detected</p>
                <p className="text-xs text-yellow-700 mt-1">
                  You&apos;re using an old QR code format. Please contact your hotel administrator to get the new permanent QR code for better security.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to {hotel?.name || 'Our Hotel'}
          </h1>
          <p className="text-gray-600 text-lg">
            Choose how you would like to access our services
          </p>
        </div>

        {/* Error message if redirect failed */}
        {redirecting && error && !validating && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Guest Access */}
          <button
            onClick={handleGuestAccess}
            disabled={redirecting}
            className="group relative overflow-hidden rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-8 text-left transition-all hover:border-blue-400 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Guest Access
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Chat with our AI assistant, request services, and get instant
                support from your room.
              </p>
              <div className="flex items-center text-blue-600 font-semibold text-sm">
                Continue as Guest
                <span className="ml-2">→</span>
              </div>
            </div>
            {redirecting && (
              <div className="absolute inset-0 bg-blue-600 bg-opacity-10" />
            )}
          </button>

          {/* Staff Access */}
          <button
            onClick={handleStaffAccess}
            disabled={redirecting}
            className="group relative overflow-hidden rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-8 text-left transition-all hover:border-green-400 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-600 text-white mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Staff Access
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Manage guest requests, view analytics, and monitor hotel
                operations from the staff console.
              </p>
              <div className="flex items-center text-green-600 font-semibold text-sm">
                Continue as Staff
                <span className="ml-2">→</span>
              </div>
            </div>
            {redirecting && (
              <div className="absolute inset-0 bg-green-600 bg-opacity-10" />
            )}
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Security Note:</span> This access link
            is secure. Your role and permissions are verified when you log in.
            No sensitive information is stored in this QR code.
          </p>
        </div>

        {/* Loading indicator */}
        {redirecting && (
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Preparing your access...</span>
          </div>
        )}
      </div>
    </div>
  )
}
