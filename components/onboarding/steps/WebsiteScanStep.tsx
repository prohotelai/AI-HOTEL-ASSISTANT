/**
 * Onboarding Step: Website Scan
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Loader2, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react'

interface WebsiteScanStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

interface ScanResult {
  faqs: Array<{ question: string; answer: string }>
  services: string[]
  policies: string[]
  contact: {
    phone?: string
    email?: string
    address?: string
  }
}

export default function WebsiteScanStep({ hotelId, onComplete, onNext, onBack }: WebsiteScanStepProps) {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan() {
    if (!url) return

    setScanning(true)
    setError(null)

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, saveToKb: true }),
      })

      if (res.ok) {
        const data = await res.json()
        setScanResult(data.data)
      } else {
        setError('Failed to scan website. You can skip this step.')
      }
    } catch (err) {
      setError('Website scan unavailable. You can skip this step.')
    } finally {
      setScanning(false)
    }
  }

  function handleContinue() {
    if (scanResult) {
      onComplete()
    }
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
          Import from Your Website
        </h2>
        <p className="text-brand-muted">
          We&apos;ll automatically extract FAQs, services, and policies from your website
        </p>
      </div>

      {!scanResult ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold text-brand-text">
              Website URL
            </h3>
          </div>

          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.yourhotel.com"
            className="w-full px-4 py-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent mb-4"
            disabled={scanning}
          />

          {error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleScan}
            disabled={!url || scanning}
            className="w-full px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning website...
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                Scan Website
              </>
            )}
          </button>

          <p className="text-sm text-brand-muted mt-3 text-center">
            This usually takes 10-30 seconds
          </p>
        </div>
      ) : (
        <div className="space-y-6 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900">Scan Complete!</h4>
              <p className="text-sm text-green-700">
                Found {scanResult.faqs.length} FAQs, {scanResult.services.length} services, and {scanResult.policies.length} policies
              </p>
            </div>
          </div>

          {scanResult.faqs.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border">
              <h3 className="text-lg font-semibold text-brand-text mb-4">FAQs Extracted</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {scanResult.faqs.slice(0, 5).map((faq, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-brand-text text-sm mb-1">{faq.question}</p>
                    <p className="text-sm text-brand-muted">{faq.answer}</p>
                  </div>
                ))}
              </div>
              {scanResult.faqs.length > 5 && (
                <p className="text-sm text-brand-muted mt-3">
                  + {scanResult.faqs.length - 5} more FAQs saved
                </p>
              )}
            </div>
          )}

          {scanResult.services.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border">
              <h3 className="text-lg font-semibold text-brand-text mb-3">Services</h3>
              <div className="flex flex-wrap gap-2">
                {scanResult.services.map((service, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
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
            disabled={scanning}
            className="px-8 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      </div>
    </motion.div>
  )
}
