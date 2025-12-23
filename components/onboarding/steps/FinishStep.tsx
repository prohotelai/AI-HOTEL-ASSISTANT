/**
 * Onboarding Step: Finish & Activation
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface FinishStepProps {
  hotelId: string
  onComplete: () => void
}

export default function FinishStep({ hotelId, onComplete }: FinishStepProps) {
  const { data: session, update } = useSession()
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')

  async function handleActivate() {
    setActivating(true)
    setError('')

    try {
      if (!hotelId) {
        throw new Error('No hotel context found')
      }

      // Mark onboarding as complete and set hotel status to COMPLETED
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to complete onboarding')
      }

      // Update session to reflect onboarding completion
      await update()
      
      onComplete()
      
      // Middleware handles redirect to /dashboard/admin based on session update
    } catch (error: any) {
      console.error('Failed to activate:', error)
      setError(error.message || 'Failed to complete onboarding. Please try again.')
      setActivating(false)
    }
  }

  const completedFeatures = [
    { label: 'Hotel profile configured', icon: CheckCircle2 },
    { label: 'Rooms set up', icon: CheckCircle2 },
    { label: 'Services enabled', icon: CheckCircle2 },
    { label: 'AI assistant ready', icon: Sparkles },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 text-green-600 mb-6"
      >
        <CheckCircle2 className="w-12 h-12" />
      </motion.div>

      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        You&apos;re All Set!
      </h2>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Your hotel is configured and your AI assistant is ready to help guests 24/7
      </p>

      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          What You&apos;ve Completed
        </h3>
        <div className="space-y-4">
          {completedFeatures.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center justify-center gap-3"
            >
              <feature.icon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-gray-700">{feature.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-brand-primary to-brand-accent rounded-xl p-8 text-white mb-8">
        <h3 className="text-2xl font-bold mb-3">Ready to Go Live?</h3>
        <p className="mb-6 opacity-90">
          Activate your AI assistant now and start providing 24/7 support to your guests
        </p>
        <button
          onClick={handleActivate}
          disabled={activating}
          className="px-8 py-4 bg-white text-brand-primary rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {activating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              Activate Assistant
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      <div className="text-sm text-brand-muted">
        Need help? Contact us at{' '}
        <a href="mailto:support@aihotelassistant.com" className="text-brand-primary hover:underline">
          support@aihotelassistant.com
        </a>
      </div>
    </motion.div>
  )
}
