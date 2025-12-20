'use client'

import { useEffect, useState } from 'react'
import { MetricCard, DataTable, Alert, StatusSummary } from '@/components/pms/DashboardComponents'

interface AnalyticsData {
  occupancyRate: number
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  revenue: number
  bookings: number
  checkIns: number
  checkOuts: number
  averageStay: number
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month')

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      // This would normally fetch from an analytics API endpoint
      // For now, we'll simulate with placeholder data
      await new Promise((resolve) => setTimeout(resolve, 500))

      setAnalytics({
        occupancyRate: 78.5,
        totalRooms: 120,
        occupiedRooms: 94,
        availableRooms: 26,
        revenue: 18750,
        bookings: 156,
        checkIns: 23,
        checkOuts: 18,
        averageStay: 3.2
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">View PMS metrics, occupancy, and revenue analytics</p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Occupancy Status */}
        {analytics && (
          <>
            <div className="mb-6">
              <StatusSummary
                status={analytics.occupancyRate > 80 ? 'operational' : analytics.occupancyRate > 50 ? 'warning' : 'error'}
                message={`Occupancy rate at ${analytics.occupancyRate}% - ${analytics.occupiedRooms} of ${analytics.totalRooms} rooms occupied`}
              />
            </div>

            {/* Key Metrics */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Occupancy Rate"
                  value={`${analytics.occupancyRate}%`}
                  icon="🏨"
                  color="blue"
                />
                <MetricCard
                  title="Total Revenue"
                  value={`$${analytics.revenue.toLocaleString()}`}
                  icon="💰"
                  color="green"
                />
                <MetricCard
                  title="Active Bookings"
                  value={analytics.bookings}
                  icon="📅"
                  color="purple"
                />
                <MetricCard
                  title="Avg. Stay"
                  value={`${analytics.averageStay} nights`}
                  icon="🌙"
                  color="amber"
                />
              </div>
            </div>

            {/* Room Status */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Status</h2>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  title="Occupied"
                  value={analytics.occupiedRooms}
                  subtitle={`${((analytics.occupiedRooms / analytics.totalRooms) * 100).toFixed(1)}% of total`}
                  icon="🏨"
                  color="green"
                />
                <MetricCard
                  title="Available"
                  value={analytics.availableRooms}
                  subtitle={`${((analytics.availableRooms / analytics.totalRooms) * 100).toFixed(1)}% of total`}
                  icon="🟦"
                  color="blue"
                />
                <MetricCard
                  title="Total Rooms"
                  value={analytics.totalRooms}
                  subtitle="Hotel capacity"
                  icon="🔢"
                  color="amber"
                />
              </div>
            </div>

            {/* Activity */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Activity</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Check-Ins"
                  value={analytics.checkIns}
                  icon="📍"
                  color="green"
                  trend="up"
                />
                <MetricCard
                  title="Check-Outs"
                  value={analytics.checkOuts}
                  icon="🚪"
                  color="amber"
                  trend="stable"
                />
                <MetricCard
                  title="Pending Check-Ins"
                  value={analytics.bookings - analytics.checkIns}
                  icon="⏰"
                  color="blue"
                />
              </div>
            </div>

            {/* Occupancy Trend Chart (Placeholder) */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Trend</h2>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                <p>Chart visualization would go here</p>
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6">
            <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
