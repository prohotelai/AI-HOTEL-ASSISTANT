/**
 * Onboarding Step: Invite Staff
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Mail, CheckCircle2, Clock, Trash2 } from 'lucide-react'

interface InviteStaffStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

interface Invitation {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

export default function InviteStaffStep({ hotelId, onComplete, onNext, onBack }: InviteStaffStepProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'reception' | 'staff'>('staff')
  const [inviting, setInviting] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!hotelId) return

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/invite-staff`)
      if (res.ok) {
        const data = await res.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    }
  }, [hotelId])

  useEffect(() => {
    void fetchInvitations()
  }, [fetchInvitations])

  async function handleInvite() {
    if (!email) return

    setInviting(true)
    setSuccess(null)

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/invite-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(`Invitation sent to ${email}`)
        setEmail('')
        await fetchInvitations()
      }
    } catch (error) {
      console.error('Invitation error:', error)
    } finally {
      setInviting(false)
    }
  }

  function handleContinue() {
    if (invitations.length > 0) {
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
          Invite Your Team
        </h2>
        <p className="text-brand-muted">
          Add staff members who will help manage guest communications
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border mb-6">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-5 h-5 text-brand-primary" />
          <h3 className="text-lg font-semibold text-brand-text">
            Send Invitation
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="staff">Staff</option>
              <option value="reception">Reception</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <button
          onClick={handleInvite}
          disabled={!email || inviting}
          className="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {inviting ? (
            <>
              <Mail className="w-5 h-5 animate-pulse" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Send Invitation
            </>
          )}
        </button>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border mb-6">
          <h3 className="text-lg font-semibold text-brand-text mb-4">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-brand-muted" />
                  <div>
                    <p className="font-medium text-brand-text">{invite.email}</p>
                    <p className="text-sm text-brand-muted capitalize">{invite.role}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Staff members will receive an email with a link to accept the invitation. You can always add more team members later.
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
