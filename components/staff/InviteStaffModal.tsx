/**
 * Invite Staff Modal - Send invitation to new staff member
 */
'use client'

import { useState } from 'react'
import { X, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Department model not in schema yet
type Department = {
  id: string
  name: string
}

type StaffRole = 'staff' | 'reception' | 'manager' | 'owner'

interface InviteStaffFormState {
  email: string
  firstName: string
  lastName: string
  position: string
  departmentId: string
  role: StaffRole
}

interface InviteStaffResponse {
  success: boolean
  invitation?: {
    id: string
    email: string
    inviteUrl: string
    expiresAt: string
  }
  error?: string
  message?: string
}

interface InviteStaffModalProps {
  isOpen: boolean
  onClose: () => void
  departments: Department[]
  hotelId: string
}

export default function InviteStaffModal({ isOpen, onClose, departments, hotelId }: InviteStaffModalProps) {
  const [formData, setFormData] = useState<InviteStaffFormState>({
    email: '',
    firstName: '',
    lastName: '',
    position: '',
    departmentId: '',
    role: 'staff'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLink, setMagicLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data: InviteStaffResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setSuccess(true)
      setMagicLink(data.invitation?.inviteUrl ?? null)

      // Reset form after 3 seconds
      setTimeout(() => {
        handleClose()
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      position: '',
      departmentId: '',
      role: 'staff'
    })
    setSuccess(false)
    setError(null)
    setMagicLink(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invite New Staff Member</h2>
            <p className="text-sm text-gray-600 mt-1">
              Send an invitation email with a magic link to register
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Success State */}
        {success && (
          <div className="p-6 bg-green-50 border-l-4 border-green-500">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-green-900">
                  Invitation sent successfully!
                </h3>
                <p className="text-sm text-green-700 mt-2">
                  An email has been sent to <strong>{formData.email}</strong> with instructions to complete registration.
                </p>
                {magicLink && (
                  <div className="mt-4 p-3 bg-white rounded border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Magic Link (for testing):</p>
                    <code className="text-xs text-blue-600 break-all">{magicLink}</code>
                  </div>
                )}
                <p className="text-xs text-green-600 mt-3">
                  This window will close automatically in 5 seconds...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 border-l-4 border-red-500">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-900">Failed to send invitation</h3>
                <p className="text-sm text-red-700 mt-2">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@hotel.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Position */}
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Front Desk Agent"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Department */}
              <div>
                <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  id="departmentId"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="md:col-span-2">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  System Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="staff">Staff (View only)</option>
                  <option value="reception">Reception (Manage tickets)</option>
                  <option value="manager">Manager (Full access except delete)</option>
                  <option value="owner">Owner (Full system access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the level of access this staff member will have in the system
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3 text-sm text-blue-900">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>An email will be sent with a secure magic link</li>
                    <li>The link expires in 24 hours</li>
                    <li>Staff member completes registration by setting their password</li>
                    <li>They&apos;ll be automatically added to the system with the selected role</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
