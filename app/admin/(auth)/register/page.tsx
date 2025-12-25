/**
 * Admin Registration Page (Signup)
 * 
 * CRITICAL: This page MUST show the Hotel Name field.
 * If you don't see it, check:
 * 1. This file is being served (not cached)
 * 2. Build includes this change
 * 3. Browser cache is cleared
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hotel } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    hotelName: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // DEBUG: Log component mount to verify page is rendering
  console.log('🔵 SIGNUP PAGE LOADED - Hotel name field should be visible below password')
  console.log('Form state:', { formData })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate form on client side
      if (!formData.name.trim()) {
        throw new Error('Full name is required')
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required')
      }
      if (!formData.password) {
        throw new Error('Password is required')
      }
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }
      if (!formData.hotelName.trim()) {
        throw new Error('Hotel name is required')
      }

      // DEBUG: Log the payload being sent
      console.log('📋 SIGNUP FORM SUBMISSION:', {
        name: formData.name,
        email: formData.email,
        hotelName: formData.hotelName,
        timestamp: new Date().toISOString(),
      })

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      // Handle resume case - registration already in progress
      if (response.ok && result.resumable) {
        console.log('✅ Registration already in progress - resuming:', {
          hotelId: result.hotelId,
          userId: result.userId,
        })

        // Log them in and redirect to onboarding to resume
        router.push('/admin/login?registered=true&resume=true')
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      console.log('✅ Signup successful:', { hotelId: result.hotelId, userId: result.userId })

      // NEW: Auto-login after signup and redirect to wizard
      console.log('🔐 Auto-logging in user...')
      
      const loginResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (loginResult?.error) {
        console.error('Auto-login failed:', loginResult.error)
        // Fallback: redirect to login page
        router.push('/admin/login?registered=true')
        return
      }

      console.log('✅ Auto-login successful, redirecting to /admin/setup-wizard')
      // Redirect to setup wizard after auto-login
      router.push('/admin/setup-wizard')
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Hotel className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Set up your hotel management account
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Already have an account?{' '}
            <Link href="/admin/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* VISUAL INDICATOR: This shows the hotel name field is below */}
          <div className="rounded-md bg-blue-50 border-2 border-blue-500 p-4">
            <p className="text-sm font-bold text-blue-900">
              ✓ Hotel Name Field is ACTIVE and REQUIRED below
            </p>
            <p className="text-xs text-blue-700 mt-1">
              You must enter your hotel name (2+ characters) to create an account.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                className="mt-1"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700">
                Hotel name *
              </label>
              <p className="text-xs text-orange-600 font-semibold mb-2">
                ⚠️ Hotel name is required and cannot be changed later. Please verify it&apos;s correct.
              </p>
              <Input
                id="hotelName"
                name="hotelName"
                type="text"
                required
                minLength={2}
                value={formData.hotelName}
                onChange={handleChange}
                className="mt-1"
                placeholder="e.g., Sunset Beach Hotel"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 2 characters. This will be used as your hotel&apos;s permanent identifier.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Hotel name is required to set up your account and cannot be changed later.
          </p>
        </form>
      </div>
    </div>
  )
}
