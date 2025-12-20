/**
 * Onboarding Step 3: Widget Setup & Installation
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Code, Copy, Check, ExternalLink, QrCode } from 'lucide-react'

interface WidgetStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

interface WidgetData {
  key: string
  keyPrefix: string
  snippet: string
}

export default function WidgetStep({ hotelId, onComplete, onNext, onBack }: WidgetStepProps) {
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const generateWidget = useCallback(async () => {
    if (!hotelId) return

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/widget/generate`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setWidgetData(data)
      }
    } catch (error) {
      console.error('Failed to generate widget:', error)
    } finally {
      setLoading(false)
    }
  }, [hotelId])

  useEffect(() => {
    void generateWidget()
  }, [generateWidget])

  async function handleCopy() {
    if (!widgetData) return

    await navigator.clipboard.writeText(widgetData.snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleContinue() {
    onComplete()
    onNext()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-brand-text mb-2">
          Install Your Chat Widget
        </h2>
        <p className="text-brand-muted">
          Add this code to your website to enable the AI assistant for your guests
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold text-brand-text">
              Widget Snippet
            </h3>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-gray-800">{widgetData?.snippet}</pre>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Installation:</strong> Paste this code just before the closing{' '}
            <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> tag on your website.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border mb-6">
        <div className="flex items-center gap-3 mb-4">
          <QrCode className="w-5 h-5 text-brand-primary" />
          <h3 className="text-lg font-semibold text-brand-text">
            Widget Key
          </h3>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-muted mb-1">Your unique widget key:</p>
              <code className="text-brand-text font-mono font-semibold">
                {widgetData?.keyPrefix}...
              </code>
            </div>
          </div>
        </div>

        <p className="text-sm text-brand-muted mt-3">
          This key authenticates your widget. Keep it secure and never share it publicly.
        </p>
      </div>

      <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 rounded-xl p-6 border border-brand-primary/20 mb-6">
        <h4 className="font-semibold text-brand-text mb-2">
          Need Help Installing?
        </h4>
        <p className="text-sm text-brand-muted mb-4">
          Our team can help you install the widget on your website.
        </p>
        <a
          href="mailto:support@aihotelassistant.com"
          className="inline-flex items-center gap-2 text-brand-primary hover:underline text-sm font-medium"
        >
          Contact Support
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-brand-muted hover:text-brand-text transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors"
        >
          Continue →
        </button>
      </div>
    </motion.div>
  )
}
