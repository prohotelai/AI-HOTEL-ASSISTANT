'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function StaffPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const staffId = searchParams?.get('staffId')
  const token = searchParams?.get('token')

  if (!staffId || !token) {
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

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/staff/create-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          password,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create password')
      }

      // Password created successfully - now log in
      router.push(`/staff/login?token=${token}&staffId=${staffId}&passwordCreated=true`)
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
            <Lock className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Password</h1>
          <p className="text-gray-600">First-time setup - create a secure password</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                placeholder="Min. 8 characters"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Re-enter password"
              disabled={isLoading}
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center">
                <CheckCircle className={`w-4 h-4 mr-2 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                At least 8 characters
              </li>
              <li className="flex items-center">
                <CheckCircle className={`w-4 h-4 mr-2 ${password === confirmPassword && password.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                Passwords match
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
            disabled={isLoading || password.length < 8 || password !== confirmPassword}
          >
            {isLoading ? 'Creating Password...' : 'Create Password & Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}
