/**
 * Onboarding Step: Integrations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plug, CheckCircle2, ExternalLink } from 'lucide-react'

interface IntegrationsStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

interface Integration {
  id: string
  name: string
  status: 'available' | 'connected' | 'coming_soon'
  logo?: string
  description?: string
}

export default function IntegrationsStep({ hotelId, onComplete, onNext, onBack }: IntegrationsStepProps) {
  const [integrations, setIntegrations] = useState<any>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    if (!hotelId) return

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/integration/connect`)
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations)
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    }
  }, [hotelId])

  useEffect(() => {
    void fetchIntegrations()
  }, [fetchIntegrations])

  async function handleConnect(type: string, providerId: string) {
    setConnecting(providerId)
    try {
      await fetch(`/api/onboarding/${hotelId}/integration/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, provider: providerId }),
      })
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setConnecting(null)
    }
  }

  function handleContinue() {
    onComplete()
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-brand-text mb-2">
          Connect Your Systems
        </h2>
        <p className="text-brand-muted">
          Integrate with your PMS, calendar, and payment systems (optional)
        </p>
      </div>

      <div className="space-y-6 mb-6">
        {/* PMS Integrations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border">
          <div className="flex items-center gap-3 mb-4">
            <Plug className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold text-brand-text">
              Property Management System (PMS)
            </h3>
          </div>

          {integrations?.pms && (
            <div className="grid md:grid-cols-2 gap-4">
              {integrations.pms.map((pms: Integration) => (
                <div
                  key={pms.id}
                  className="border border-brand-border rounded-lg p-4 hover:border-brand-primary transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-brand-text">{pms.name}</h4>
                    {pms.status === 'available' && (
                      <button
                        onClick={() => handleConnect('pms', pms.id)}
                        disabled={connecting === pms.id}
                        className="text-sm px-3 py-1 bg-brand-primary/10 text-brand-primary rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
                      >
                        {connecting === pms.id ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                    {pms.status === 'coming_soon' && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-muted">
                    Sync bookings and guest data automatically
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Integrations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border">
          <h3 className="text-lg font-semibold text-brand-text mb-4">
            Calendar Integration
          </h3>

          {integrations?.calendar && (
            <div className="grid md:grid-cols-2 gap-4">
              {integrations.calendar.map((cal: Integration) => (
                <div
                  key={cal.id}
                  className="border border-brand-border rounded-lg p-4 hover:border-brand-primary transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-brand-text">{cal.name}</h4>
                    <button
                      onClick={() => handleConnect('calendar', cal.id)}
                      className="text-sm px-3 py-1 bg-brand-primary/10 text-brand-primary rounded hover:bg-brand-primary/20 transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                  <p className="text-sm text-brand-muted">
                    Manage reservations and availability
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Integrations can be configured later from your dashboard. You can safely skip this step.
        </p>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 text-brand-muted hover:text-brand-text transition-colors"
        >
          ← Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleContinue}
            className="px-6 py-3 text-brand-muted hover:text-brand-text transition-colors"
          >
            Skip for Now
          </button>
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    </motion.div>
  )
}
