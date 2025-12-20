/**
 * Hook for validating QR temporary sessions
 * Used by pages that accept both traditional auth and QR login
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface QRSessionData {
  sessionId: string
  role: string
  userId: string
  expiresAt: string
  hotelId: string
}

export function useQRSession() {
  const router = useRouter()
  const [session, setSession] = useState<QRSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateSession = async () => {
      try {
        setLoading(true)
        
        // Check localStorage for QR session ID
        const sessionId = localStorage.getItem('qrSessionId')
        if (!sessionId) {
          setLoading(false)
          return
        }

        // Validate session with backend
        const response = await fetch('/api/qr/universal/session/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sessionId })
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          // Session is invalid, clear it
          localStorage.removeItem('qrSessionId')
          setSession(null)
          setError(data.error || 'Session is no longer valid')
          return
        }

        // Check if session is expired
        const expiresAt = new Date(data.expiresAt)
        if (new Date() > expiresAt) {
          localStorage.removeItem('qrSessionId')
          setSession(null)
          setError('Session has expired')
          return
        }

        setSession(data.session)
      } catch (err: any) {
        console.error('Session validation error:', err)
        setError(err.message)
        localStorage.removeItem('qrSessionId')
      } finally {
        setLoading(false)
      }
    }

    validateSession()

    // Validate session every 5 minutes
    const interval = setInterval(validateSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const logout = () => {
    localStorage.removeItem('qrSessionId')
    setSession(null)
  }

  return { session, loading, error, logout }
}
