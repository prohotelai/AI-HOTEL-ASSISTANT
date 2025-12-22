/**
 * Onboarding Step 1: Hotel Details Configuration
 * 
 * Displays hotel information from signup (name cannot be changed)
 * Allows updating: address, phone, email, website
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, MapPin, Phone, Mail, Globe } from 'lucide-react'

interface HotelDetailsStepProps {
  hotelData: {
    id: string
    name: string
    address: string | null
    phone: string | null
    email: string | null
    website: string | null
  }
  onComplete: () => void
  onNext: () => void
}

export default function HotelDetailsStep({
  hotelData,
  onComplete,
  onNext,
}: HotelDetailsStepProps) {
  const [formData, setFormData] = useState({
    address: hotelData.address || '',
    phone: hotelData.phone || '',
    email: hotelData.email || '',
    website: hotelData.website || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/hotels/${hotelData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update hotel details')
      }

      setSuccess(true)
      onComplete()

      // Move to next step after brief delay
      setTimeout(onNext, 800)
    } catch (error: any) {
      console.error('Failed to save details:', error)
      setError(error.message || 'Failed to save details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Hotel Details
        </h2>
        <p className="text-gray-600">
          Configure your hotel&apos;s contact information
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">✓ Hotel details saved successfully</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hotel Name - Read Only */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Hotel Name (Locked)
            </h3>
          </div>
          <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-gray-900 font-medium text-lg">{hotelData.name}</p>
            <p className="text-sm text-gray-600 mt-2">
              ✓ This name was set during your signup and is now permanent. You cannot change it.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Contact Information
            </h3>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Hotel Street, City, State 12345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="info@hotel.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-2" />
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://www.hotel.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can update these details anytime from your hotel settings
        </p>
      </form>
    </motion.div>
  )
}
