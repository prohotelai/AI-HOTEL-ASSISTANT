'use client'

import { useState } from 'react'

type SupportTicketFormProps = {
  onSuccess: (ticket: any) => void
}

export default function SupportTicketForm({ onSuccess }: SupportTicketFormProps) {
  const [subject, setSubject] = useState('')
  const [issue, setIssue] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          issue,
          priority,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create ticket')
      }

      // Reset form
      setSubject('')
      setIssue('')
      setPriority('MEDIUM')

      // Call success callback
      onSuccess(data.ticket)
    } catch (err: any) {
      setError(err.message || 'Failed to create support ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Ticket</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of the issue"
          required
          minLength={5}
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="LOW">Low - General question or minor issue</option>
          <option value="MEDIUM">Medium - Issue affecting some features</option>
          <option value="HIGH">High - Important feature not working</option>
          <option value="URGENT">Urgent - Critical system failure</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="issue" className="block text-sm font-medium text-gray-700 mb-2">
          Issue Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="issue"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="Please describe the issue in detail, including steps to reproduce if applicable..."
          required
          minLength={20}
          maxLength={5000}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {issue.length}/5000 characters (minimum 20 required)
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="text-red-500">*</span> Required fields
        </p>
        <button
          type="submit"
          disabled={loading || subject.length < 5 || issue.length < 20}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Creating...' : 'Create Ticket'}
        </button>
      </div>
    </form>
  )
}
