'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Staff Dashboard QR Login Page
 * Allows staff to login using QR codes or manual token entry
 */

export default function StaffQRLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [loginMethod, setLoginMethod] = useState<'qr' | 'manual'>('qr')
  const [manualToken, setManualToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Check if already authenticated via QR
  useEffect(() => {
    const qrSessionJWT = localStorage.getItem('qr_session_jwt')
    const qrSessionExpires = localStorage.getItem('qr_session_expires')

    if (qrSessionJWT && qrSessionExpires) {
      const expirationTime = parseInt(qrSessionExpires, 10)
      const currentTime = Math.floor(Date.now() / 1000)

      if (currentTime < expirationTime) {
        // Valid QR session exists
        const qrUser = localStorage.getItem('qr_session_user')
        if (qrUser) {
          const user = JSON.parse(qrUser)
          if (user.role === 'staff') {
            setSuccess('Staff authenticated via QR. Redirecting to dashboard...')
            setTimeout(() => {
              router.push('/dashboard/staff/tasks')
            }, 1000)
          }
        }
      }
    }
  }, [router])

  /**
   * Handle QR code scanning
   */
  const handleStartScanning = async () => {
    try {
      setIsScanning(true)
      setError(null)

      if (!videoRef.current) return

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      videoRef.current.srcObject = stream

      // In production, use a QR detection library like jsQR or zxing-wasm
      // For now, we'll show a message for manual entry
      setError('QR scanning feature requires jsQR library. Please use manual entry below.')
      setIsScanning(false)

      // Stop stream
      stream.getTracks().forEach((track) => track.stop())
    } catch (err) {
      setError('Camera access denied or not available.')
      setIsScanning(false)
    }
  }

  const handleStopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      setIsScanning(false)
    }
  }

  /**
   * Handle manual token validation
   */
  const handleValidateToken = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualToken.trim()) {
      setError('Please enter a valid token')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Validate token with backend
      const user = session?.user as any
      const hotelId = user?.hotelId
      
      if (!hotelId) {
        throw new Error('Hotel ID not found in session')
      }
      
      const response = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: manualToken.trim(),
          hotelId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Token validation failed')
      }

      const sessionData = await response.json()

      // Check if user has staff role
      if (sessionData.user.role !== 'staff') {
        throw new Error('This token is for guests only. Staff tokens are required.')
      }

      // Store session
      localStorage.setItem('qr_session_jwt', sessionData.sessionJWT)
      localStorage.setItem('qr_session_user', JSON.stringify(sessionData.user))
      localStorage.setItem('qr_session_permissions', JSON.stringify(sessionData.permissions))
      localStorage.setItem('qr_session_expires', sessionData.expiresAt.toString())

      setSuccess(`Welcome, ${sessionData.user.name}! Redirecting to dashboard...`)
      setManualToken('')

      // Redirect to staff dashboard
      setTimeout(() => {
        router.push('/dashboard/staff/tasks')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Login</h1>
          <p className="text-gray-600">AI Hotel Assistant - Staff Dashboard</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Login Method Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setLoginMethod('qr')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              loginMethod === 'qr'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setLoginMethod('manual')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              loginMethod === 'manual'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Manual Token
          </button>
        </div>

        {/* QR Code Scanning */}
        {loginMethod === 'qr' && (
          <div className="space-y-4">
            {isScanning ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black aspect-square"
                />
                <button
                  onClick={handleStopScanning}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Stop Scanning
                </button>
              </>
            ) : (
              <>
                <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p className="text-gray-600 mb-4">Point your camera at the QR code</p>
                </div>

                <button
                  onClick={handleStartScanning}
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Starting...' : 'Start Camera'}
                </button>

                <p className="text-center text-sm text-gray-600">
                  No camera access?{' '}
                  <button
                    onClick={() => setLoginMethod('manual')}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Use manual token instead
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        {/* Manual Token Entry */}
        {loginMethod === 'manual' && (
          <form onSubmit={handleValidateToken} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Token
              </label>
              <textarea
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste your QR token here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !manualToken.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Validating...' : 'Login'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-xs text-gray-600">
            ProHotel AI © 2024. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
