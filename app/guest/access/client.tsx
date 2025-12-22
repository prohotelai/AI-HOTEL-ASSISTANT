'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertCircle, Loader2, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react'

type Step = 'identify' | 'confirm' | 'success'

interface GuestInfo {
  guestName: string
  roomNumber: string
  checkInDate: Date
  checkOutDate: Date
}

export default function GuestAccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hotelId = searchParams.get('hotelId')

  const [step, setStep] = useState<Step>('identify')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [documentType, setDocumentType] = useState<'passport' | 'national_id'>('passport')
  const [documentNumber, setDocumentNumber] = useState('')
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Validate hotelId
  useEffect(() => {
    if (!hotelId) {
      setError('No hotel ID provided. Please scan the QR code from your room.')
    }
  }, [hotelId])

  // Step 1: Validate guest identity
  const handleValidateGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!hotelId || !documentNumber.trim()) {
      setError('Please enter your document number')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/guest/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          documentType,
          documentNumber: documentNumber.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Guest not found or no active booking')
        setLoading(false)
        return
      }

      const data = await res.json()
      setGuestInfo(data.guest)
      setStep('confirm')
    } catch (err) {
      console.error('Validation error:', err)
      setError('Failed to validate identity. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Create session
  const handleCreateSession = async () => {
    setError(null)
    setLoading(true)

    if (!hotelId) {
      setError('Hotel ID missing')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/guest/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          documentType,
          documentNumber: documentNumber.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to create session')
        setLoading(false)
        return
      }

      const data = await res.json()
      setSessionId(data.sessionId)
      setStep('success')

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.push(data.redirectUrl)
      }, 2000)
    } catch (err) {
      console.error('Session creation error:', err)
      setError('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Go back to identification
  const handleBackToIdentify = () => {
    setStep('identify')
    setGuestInfo(null)
    setError(null)
    setDocumentNumber('')
  }

  // Step 1: Identify
  if (step === 'identify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Guest Access</h1>
            <p className="text-gray-600">Verify your identity to access hotel services</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleValidateGuest} className="space-y-4">
            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentType('passport')}
                  className={`py-2 px-4 rounded-lg border-2 transition font-medium ${
                    documentType === 'passport'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Passport
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType('national_id')}
                  className={`py-2 px-4 rounded-lg border-2 transition font-medium ${
                    documentType === 'national_id'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  National ID
                </button>
              </div>
            </div>

            {/* Document Number */}
            <div>
              <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Document Number
              </label>
              <input
                id="docNumber"
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter your document number"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                {documentType === 'passport'
                  ? 'Enter your passport number'
                  : 'Enter your national ID number'}
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !documentNumber.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Your identity is verified securely. You will not need a password.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Confirm
  if (step === 'confirm' && guestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Details</h1>
            <p className="text-gray-600">Verify the information below</p>
          </div>

          {/* Guest info */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Guest Name</p>
              <p className="text-lg font-semibold text-gray-900">{guestInfo.guestName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Room Number</p>
              <p className="text-lg font-semibold text-gray-900">{guestInfo.roomNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(guestInfo.checkInDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(guestInfo.checkOutDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Create session button */}
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 mb-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating session...
              </>
            ) : (
              <>
                Access Chat
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Back button */}
          <button
            onClick={handleBackToIdentify}
            disabled={loading}
            className="w-full border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Error message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 3: Success
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome!</h1>
          <p className="text-gray-600 mb-6">Your session has been created successfully.</p>
          <p className="text-sm text-gray-500">Redirecting to chat...</p>
        </div>
      </div>
    )
  }

  return null
}
