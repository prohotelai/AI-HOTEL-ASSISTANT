/**
 * Performance Tracker - Display and log KPI metrics
 */
'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Plus, Target, Calendar, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PerformanceMetric {
  id: string
  name: string
  value: number
  target: number | null
  unit: string | null
  periodStart: Date
  periodEnd: Date
}

interface PerformanceTrackerProps {
  metrics: PerformanceMetric[]
  staffId: string
  canEdit: boolean
}

export default function PerformanceTracker({ metrics, staffId, canEdit }: PerformanceTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    value: 0,
    target: 0,
    unit: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/staff/${staffId}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({
          name: '',
          value: 0,
          target: 0,
          unit: '',
          periodStart: new Date().toISOString().split('T')[0],
          periodEnd: new Date().toISOString().split('T')[0]
        })
        setShowAddForm(false)
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to log metric:', error)
    }
  }

  const getPerformanceStatus = (value: number, target: number | null) => {
    if (!target) return null
    const percentage = (value / target) * 100
    
    if (percentage >= 100) return 'excellent'
    if (percentage >= 80) return 'good'
    if (percentage >= 60) return 'average'
    return 'below'
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'average': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'below': return 'text-red-600 bg-red-100 border-red-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <TrendingUp className="h-5 w-5" />
      case 'below':
        return <TrendingDown className="h-5 w-5" />
      default:
        return <Minus className="h-5 w-5" />
    }
  }

  // Group metrics by name
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = []
    }
    acc[metric.name].push(metric)
    return acc
  }, {} as Record<string, PerformanceMetric[]>)

  return (
    <div className="space-y-6">
      {/* Add Metric Button */}
      {canEdit && !showAddForm && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Performance Metric
          </Button>
        </div>
      )}

      {/* Add Metric Form */}
      {showAddForm && (
        <div className="border border-gray-300 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Log New Metric</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Metric Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metric Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Guest Satisfaction Score"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.periodStart}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value, periodEnd: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Unit */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., %, score, bookings"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Log Metric
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Display */}
      {Object.keys(groupedMetrics).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No performance metrics logged yet</p>
          {canEdit && (
            <p className="text-sm mt-2">Start tracking KPIs to monitor performance</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMetrics).map(([metricName, metricList]) => {
            const latestMetric = metricList[0] // Already sorted by date desc
            const status = getPerformanceStatus(latestMetric.value, latestMetric.target)
            const statusColor = getStatusColor(status)

            return (
              <div key={metricName} className="border border-gray-200 rounded-lg p-6 bg-white">
                {/* Metric Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{metricName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {metricList.length} {metricList.length === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                  {status && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusColor}`}>
                      {getStatusIcon(status)}
                      <span className="text-sm font-medium capitalize">{status}</span>
                    </div>
                  )}
                </div>

                {/* Latest Value */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Latest Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {latestMetric.value}
                      {latestMetric.unit && <span className="text-lg text-gray-600 ml-1">{latestMetric.unit}</span>}
                    </p>
                  </div>

                  {latestMetric.target && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          Target
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {latestMetric.target}
                          {latestMetric.unit && <span className="text-lg text-gray-600 ml-1">{latestMetric.unit}</span>}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Achievement</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round((latestMetric.value / latestMetric.target) * 100)}%
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* History */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">History</h4>
                  <div className="space-y-2">
                    {metricList.slice(0, 5).map((metric) => (
                      <div
                        key={metric.id}
                        className="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">
                            {new Date(metric.periodStart).toLocaleDateString()} - {new Date(metric.periodEnd).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-gray-900">
                            {metric.value}{metric.unit ? ` ${metric.unit}` : ''}
                          </span>
                          {metric.target && (
                            <span className="text-gray-500">
                              / {metric.target}{metric.unit ? ` ${metric.unit}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {metricList.length > 5 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      +{metricList.length - 5} more entries
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
