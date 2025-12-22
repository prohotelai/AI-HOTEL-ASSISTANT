'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

type Step = 'staffId' | 'password' | 'confirm' | 'success'

export default function StaffActivateClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hotelId = searchParams.get('hotelId')

  const [step, setStep] = useState<Step>('staffId')
  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [staffInfo, setStaffInfo] = useState<any>(null)

  if (!hotelId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Invalid Link</h1>
          <p className="text-gray-600 text-center">
            Please scan the hotel QR code to activate your account.
          </p>
        </div>
      </div>
    )
  }

  const handleStaffIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/staff/activate/route?validate=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, staffId })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Staff ID not found')
        setLoading(false)
        return
      }

      setStaffInfo(data.staff)
      setStep('password')
    } catch (err: any) {
      setError(err.message || 'Failed to validate staff ID')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setStep('confirm')
  }

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/staff/activate/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          staffId,
          password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to create account')
        setLoading(false)
        return
      }

      setStep('success')

      setTimeout(() => {
        router.push('/staff/chat')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Activate Account</h1>
        <p className="text-gray-600 text-center mb-6">
          Welcome to {staffInfo?.firstName || 'the hotel'} staff portal
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {step === 'staffId' && (
          <form onSubmit={handleStaffIdSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staff ID
              </label>
              <p className="text-xs text-gray-500 mb-2">
                You should have received this ID in your email (e.g., ST-00001)
              </p>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                placeholder="ST-00001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!staffId || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
              ) : (
                'Verify Staff ID'
              )}
            </button>
          </form>
        )}

        {step === 'password' && staffInfo && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-800">
                Name: {staffInfo.firstName} {staffInfo.lastName}
              </p>
              <p className="text-sm text-gray-600">{staffInfo.email}</p>
              <p className="text-sm text-gray-600">
                Role: {staffInfo.staffRole}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('staffId')
                  setStaffInfo(null)
                  setPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 'confirm' && staffInfo && (
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-800">
                Name: {staffInfo.firstName} {staffInfo.lastName}
              </p>
              <p className="text-sm text-gray-600">{staffInfo.email}</p>
              <p className="text-sm text-gray-600">
                Role: {staffInfo.staffRole}
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Review your information above.</strong> Once you activate, you&apos;ll be able to log in to the staff portal.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('password')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                ) : (
                  'Activate Account'
                )}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Account Activated!
              </h2>
              <p className="text-gray-600 mb-4">
                Your account has been successfully created. Redirecting to staff dashboard...
              </p>
              <Link
                href="/staff/chat"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
