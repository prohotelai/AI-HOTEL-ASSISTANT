/**
 * Onboarding Step 2: Hotel Profile Setup
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, MapPin, Globe, Upload } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface ProfileStepProps {
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

export default function ProfileStep({ onComplete, onNext, onBack }: ProfileStepProps) {
  const { data: session } = useSession()
  const hotelId = session?.user?.hotelId as string

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    timezone: 'America/New_York',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      // Update hotel profile
      const res = await fetch(`/api/hotels/${hotelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        onComplete()
        onNext()
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
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
        <h2 className="text-3xl font-bold text-brand-text mb-2">
          Tell us about your hotel
        </h2>
        <p className="text-brand-muted">
          This information helps personalize your AI assistant&apos;s responses
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold text-brand-text">
              Basic Information
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Hotel Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Grand Plaza Hotel"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="info@hotel.com"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold text-brand-text">
              Location
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="United States"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-border space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold text-brand-text">
              Online Presence
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="https://www.yourhotel.com"
            />
            <p className="text-xs text-brand-muted mt-1">
              We&apos;ll scan your website later to import FAQs automatically
            </p>
          </div>
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
            type="submit"
            disabled={saving || !formData.name}
            className="px-8 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
