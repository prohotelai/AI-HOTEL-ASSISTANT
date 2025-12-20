/**
 * Onboarding Step: Knowledge Base Import
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface KnowledgeBaseStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

export default function KnowledgeBaseStep({ hotelId, onComplete, onNext, onBack }: KnowledgeBaseStepProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'manual'>('manual')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [manualText, setManualText] = useState('')
  const [urlInput, setUrlInput] = useState('')

  async function handleManualImport() {
    if (!manualText.trim()) return

    setImporting(true)
    try {
      const res = await fetch(`/api/onboarding/${hotelId}/kb/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: manualText,
          source: 'manual',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
      }
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setImporting(false)
    }
  }

  async function handleUrlImport() {
    if (!urlInput.trim()) return

    setImporting(true)
    try {
      const res = await fetch(`/api/onboarding/${hotelId}/kb/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          source: 'url',
          sourceUrl: urlInput,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
      }
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setImporting(false)
    }
  }

  function handleContinue() {
    if (result) {
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
          Add Your Hotel Information
        </h2>
        <p className="text-brand-muted">
          Help your AI assistant learn about your hotel, policies, and services
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border mb-6">
        <div className="flex border-b border-brand-border">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'url'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <LinkIcon className="w-5 h-5 inline mr-2" />
            From URL
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Upload File
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Paste your FAQs, policies, or any information
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={10}
                placeholder="Example:&#10;Q: What time is check-in?&#10;A: Check-in is at 3:00 PM&#10;&#10;Q: Do you allow pets?&#10;A: Yes, we welcome pets with a $50 fee"
                className="w-full px-4 py-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
              />
              <button
                onClick={handleManualImport}
                disabled={!manualText.trim() || importing}
                className="mt-4 px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Content'
                )}
              </button>
            </div>
          )}

          {activeTab === 'url' && (
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Import from a webpage or document URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/faq"
                className="w-full px-4 py-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
              <button
                onClick={handleUrlImport}
                disabled={!urlInput.trim() || importing}
                className="mt-4 px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  'Import from URL'
                )}
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-brand-muted mx-auto mb-4" />
              <p className="text-brand-text mb-2 font-medium">
                Drag & drop files here
              </p>
              <p className="text-sm text-brand-muted mb-4">
                Supports PDF, DOCX, TXT files
              </p>
              <button className="px-6 py-3 bg-brand-primary/10 text-brand-primary rounded-lg font-semibold hover:bg-brand-primary/20 transition-colors">
                Browse Files
              </button>
              <p className="text-xs text-brand-muted mt-4">
                File upload coming soon
              </p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900 mb-1">Import Successful!</h4>
            <p className="text-sm text-green-700">
              Created {result.chunksCreated} knowledge chunks
              {result.vectorsIndexed > 0 && ` • Indexed ${result.vectorsIndexed} vectors`}
            </p>
          </div>
        </div>
      )}

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
