'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Key, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function GuestIdentifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [identifyMethod, setIdentifyMethod] = useState<'room' | 'passport'>('room')
  const [roomNumber, setRoomNumber] = useState('')
  const [passportId, setPassportId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const token = searchParams?.get('token')
  const hotelId = searchParams?.get('hotelId')

  if (!token || !hotelId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800">Invalid access. Please scan your QR code again.</p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/guest/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          hotelId,
          identification: identifyMethod === 'room' 
            ? { roomNumber, guestName }
            : { passportId, guestName }
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Identification failed')
      }

      const { sessionToken } = await response.json()

      // Store session token in localStorage
      localStorage.setItem('guest_session', sessionToken)

      // Redirect to guest chat
      router.push('/guest/chat')
    } catch (error: any) {
      setError(error.message || 'Failed to verify identity')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
            <User className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Identify Yourself</h1>
          <p className="text-gray-600">We need a bit of information to get you started</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Identification Method Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setIdentifyMethod('room')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              identifyMethod === 'room'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Room Number
          </button>
          <button
            type="button"
            onClick={() => setIdentifyMethod('passport')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              identifyMethod === 'passport'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Passport/ID
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
              required
            />
          </div>

          {identifyMethod === 'room' ? (
            <div>
              <label htmlFor="room-number" className="block text-sm font-medium text-gray-700 mb-2">
                Room Number
              </label>
              <input
                id="room-number"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., 301"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
                required
              />
            </div>
          ) : (
            <div>
              <label htmlFor="passport-id" className="block text-sm font-medium text-gray-700 mb-2">
                Passport / ID Number
              </label>
              <input
                id="passport-id"
                type="text"
                value={passportId}
                onChange={(e) => setPassportId(e.target.value)}
                placeholder="ID number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for verification only, not stored permanently
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Continue to Chat'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Your information is used only to personalize your experience<br />
            and is automatically deleted after checkout
          </p>
        </div>
      </div>
    </div>
  )
}
