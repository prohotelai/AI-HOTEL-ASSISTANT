'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QrCode, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function GuestAccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [qrToken, setQrToken] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check if QR token in URL (scanned from QR code)
  useEffect(() => {
    const token = searchParams?.get('token')
    if (token) {
      setQrToken(token)
      handleQRScan(token)
    }
  }, [searchParams])

  async function handleQRScan(token: string) {
    setIsLoading(true)
    setError('')

    try {
      // Resolve QR context
      const response = await fetch('/api/qr/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid QR code')
      }

      const { context } = await response.json()

      // Verify it's a guest QR code
      if (context.role !== 'GUEST') {
        throw new Error('Invalid QR code - not a guest access code')
      }

      // Redirect to identification
      router.push(`/guest/identify?token=${token}&hotelId=${context.hotelId}`)
    } catch (error: any) {
      setError(error.message || 'Failed to scan QR code')
    } finally {
      setIsLoading(false)
    }
  }

  function handleManualInput(e: React.FormEvent) {
    e.preventDefault()
    if (qrToken.trim()) {
      handleQRScan(qrToken)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
            <QrCode className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Guest!</h1>
          <p className="text-gray-600">Scan your room QR code to access hotel services</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleManualInput} className="space-y-4">
          <div>
            <label htmlFor="qr-token" className="block text-sm font-medium text-gray-700 mb-2">
              QR Code Token
            </label>
            <input
              id="qr-token"
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Enter QR code token"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
            disabled={isLoading || !qrToken.trim()}
          >
            {isLoading ? 'Verifying...' : 'Continue'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            QR code available in your room<br />
            or at the front desk
          </p>
        </div>
      </div>
    </div>
  )
}
