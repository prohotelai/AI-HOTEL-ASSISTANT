'use client'

import { useEffect, useState } from 'react'
import { Alert } from '@/components/pms/DashboardComponents'

interface HotelConfig {
  hotelName: string
  checkInTime: string
  checkOutTime: string
  timezone: string
  currency: string
  maxGuestCapacity: number
  maxRoomBlocks: number
}

interface JobScheduleConfig {
  housekeeping: boolean
  housekeepingInterval: number
  maintenance: boolean
  maintenanceInterval: number
  invoices: boolean
  invoicesInterval: number
  availability: boolean
  availabilityInterval: number
  noShow: boolean
  noShowInterval: number
}

export default function ConfigurationPage() {
  const [hotelConfig, setHotelConfig] = useState<HotelConfig>({
    hotelName: 'My Hotel',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    timezone: 'UTC',
    currency: 'USD',
    maxGuestCapacity: 500,
    maxRoomBlocks: 10
  })

  const [jobConfig, setJobConfig] = useState<JobScheduleConfig>({
    housekeeping: true,
    housekeepingInterval: 60,
    maintenance: true,
    maintenanceInterval: 120,
    invoices: true,
    invoicesInterval: 1440,
    availability: true,
    availabilityInterval: 30,
    noShow: true,
    noShowInterval: 120
  })

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'hotel' | 'jobs'>('hotel')

  const handleHotelChange = (field: keyof HotelConfig, value: any) => {
    setHotelConfig(prev => ({
      ...prev,
      [field]: field.includes('max') || field.includes('Time') ? value : value
    }))
  }

  const handleJobChange = (field: keyof JobScheduleConfig, value: any) => {
    setJobConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveHotelConfig = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess('Hotel configuration saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const saveJobConfig = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess('Job schedule configuration saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings & Configuration</h1>
          <p className="text-gray-600">Manage hotel settings, business rules, and job schedules</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('hotel')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'hotel'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Hotel Settings
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'jobs'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Job Schedules
          </button>
        </div>

        {/* Hotel Settings Tab */}
        {activeTab === 'hotel' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
              <input
                type="text"
                value={hotelConfig.hotelName}
                onChange={(e) => handleHotelChange('hotelName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hotel name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-In Time</label>
                <input
                  type="time"
                  value={hotelConfig.checkInTime}
                  onChange={(e) => handleHotelChange('checkInTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-Out Time</label>
                <input
                  type="time"
                  value={hotelConfig.checkOutTime}
                  onChange={(e) => handleHotelChange('checkOutTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={hotelConfig.timezone}
                  onChange={(e) => handleHotelChange('timezone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>UTC</option>
                  <option>EST</option>
                  <option>CST</option>
                  <option>MST</option>
                  <option>PST</option>
                  <option>GMT</option>
                  <option>CET</option>
                  <option>IST</option>
                  <option>JST</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={hotelConfig.currency}
                  onChange={(e) => handleHotelChange('currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>JPY</option>
                  <option>CAD</option>
                  <option>AUD</option>
                  <option>INR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Guest Capacity</label>
                <input
                  type="number"
                  value={hotelConfig.maxGuestCapacity}
                  onChange={(e) => handleHotelChange('maxGuestCapacity', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Room Blocks</label>
                <input
                  type="number"
                  value={hotelConfig.maxRoomBlocks}
                  onChange={(e) => handleHotelChange('maxRoomBlocks', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveHotelConfig}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Hotel Settings'}
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 rounded font-medium transition">
                Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {/* Job Schedule Tab */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
              <p>Configure automatic job schedules. Intervals are in minutes.</p>
            </div>

            {/* Housekeeping Job */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Housekeeping Round</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jobConfig.housekeeping}
                    onChange={(e) => handleJobChange('housekeeping', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  value={jobConfig.housekeepingInterval}
                  onChange={(e) => handleJobChange('housekeepingInterval', parseInt(e.target.value))}
                  disabled={!jobConfig.housekeeping}
                  className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                  min="5"
                />
              </div>
            </div>

            {/* Maintenance Job */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Maintenance Scheduler</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jobConfig.maintenance}
                    onChange={(e) => handleJobChange('maintenance', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  value={jobConfig.maintenanceInterval}
                  onChange={(e) => handleJobChange('maintenanceInterval', parseInt(e.target.value))}
                  disabled={!jobConfig.maintenance}
                  className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                  min="5"
                />
              </div>
            </div>

            {/* Invoice Generation Job */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Invoice Generator</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jobConfig.invoices}
                    onChange={(e) => handleJobChange('invoices', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  value={jobConfig.invoicesInterval}
                  onChange={(e) => handleJobChange('invoicesInterval', parseInt(e.target.value))}
                  disabled={!jobConfig.invoices}
                  className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                  min="5"
                />
              </div>
            </div>

            {/* Availability Recalc Job */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Availability Recalc</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jobConfig.availability}
                    onChange={(e) => handleJobChange('availability', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  value={jobConfig.availabilityInterval}
                  onChange={(e) => handleJobChange('availabilityInterval', parseInt(e.target.value))}
                  disabled={!jobConfig.availability}
                  className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                  min="5"
                />
              </div>
            </div>

            {/* No-Show Check Job */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">No-Show Checker</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jobConfig.noShow}
                    onChange={(e) => handleJobChange('noShow', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  value={jobConfig.noShowInterval}
                  onChange={(e) => handleJobChange('noShowInterval', parseInt(e.target.value))}
                  disabled={!jobConfig.noShow}
                  className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                  min="5"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveJobConfig}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Job Configuration'}
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 rounded font-medium transition">
                Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {/* Alerts */}
        {success && (
          <div className="mt-6">
            <Alert type="success" title="Success" message={success} onClose={() => setSuccess(null)} />
          </div>
        )}

        {error && (
          <div className="mt-6">
            <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
