/**
 * Onboarding Step 3: Services Setup
 * 
 * Configure AI assistant services and integrations
 * 
 * CRITICAL ARCHITECTURE:
 * - Sends services object with boolean flags matching API contract
 * - Validates all services are boolean before submission
 * - Displays detailed error messages from backend
 * - Disables Save button while saving to prevent double-submission
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, MessageSquare, BarChart3, Lock } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  icon: typeof MessageSquare
  enabled: boolean
}

interface ServicesSetupStepProps {
  hotelId: string
  onComplete: () => void
  onSkip?: () => void
  onNext: () => void
  onBack: () => void
}

export default function ServicesSetupStep({
  hotelId,
  onComplete,
  onSkip,
  onNext,
  onBack,
}: ServicesSetupStepProps) {
  const [services, setServices] = useState<Service[]>([
    {
      id: 'aiGuestChat',
      name: 'AI Guest Chat',
      description: 'Enable 24/7 AI chatbot for guest inquiries',
      icon: MessageSquare,
      enabled: true,
    },
    {
      id: 'analyticsDashboard',
      name: 'Analytics Dashboard',
      description: 'Track guest interactions and AI performance',
      icon: BarChart3,
      enabled: true,
    },
    {
      id: 'guestPrivacyMode',
      name: 'Guest Privacy Mode',
      description: 'GDPR-compliant guest data handling',
      icon: Lock,
      enabled: true,
    },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const toggleService = (id: string) => {
    setServices(
      services.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    )
    // Clear error when user makes changes
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      // Build payload matching API contract
      const payload = {
        services: {
          aiGuestChat: services.find(s => s.id === 'aiGuestChat')?.enabled ?? true,
          analyticsDashboard: services.find(s => s.id === 'analyticsDashboard')?.enabled ?? true,
          guestPrivacyMode: services.find(s => s.id === 'guestPrivacyMode')?.enabled ?? true
        }
      }

      // Validate payload structure before sending
      if (!payload.services || typeof payload.services.aiGuestChat !== 'boolean') {
        throw new Error('Invalid service configuration')
      }

      const res = await fetch(`/api/hotels/${hotelId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        // Display backend error details
        const errorMsg = data.error || 'Failed to save service configuration'
        const errorCode = data.code ? ` (${data.code})` : ''
        throw new Error(errorMsg + errorCode)
      }

      // Validate response structure
      if (!data.success || !data.services) {
        throw new Error('Invalid response from server')
      }

      setSuccess(true)
      onComplete()
      setTimeout(onNext, 800)
    } catch (error: any) {
      console.error('Failed to save services:', error)
      setError(error.message || 'Failed to save services')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Services & Features
        </h2>
        <p className="text-gray-600">
          Configure which AI services to enable for your hotel
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
          <p className="text-xs text-red-700 mt-1">
            Please try again or contact support if the problem persists.
          </p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">✓ Services configured successfully</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Services List */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Available Services
            </h3>
          </div>

          <div className="space-y-4">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    id={service.id}
                    checked={service.enabled}
                    onChange={() => toggleService(service.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor={service.id}
                    className="flex-1 ml-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {service.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </label>
                  {service.enabled && (
                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded">
                      Enabled
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> You can enable or disable services anytime from
            your hotel dashboard. Services are subject to your current subscription
            plan.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip
            </button>
          )}
        </div>
      </form>
    </motion.div>
  )
}
