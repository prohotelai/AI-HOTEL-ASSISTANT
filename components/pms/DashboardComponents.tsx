'use client'

import { useState } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: 'up' | 'down' | 'stable'
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple'
}

/**
 * Metric Card Component
 * Displays a single metric with optional trend
 */
export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue'
}: MetricCardProps) {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', heading: 'text-blue-900' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', heading: 'text-green-900' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', heading: 'text-red-900' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', heading: 'text-amber-900' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', heading: 'text-purple-900' }
  }

  const config = colorConfig[color]
  const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '→'

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold uppercase ${config.text}`}>{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${config.heading}`}>{value}</p>
      {subtitle && <p className={`text-xs ${config.text} mt-1`}>{subtitle}</p>}
      {trend && <p className={`text-xs ${config.text} mt-2`}>{trendIcon} Trend</p>}
    </div>
  )
}

/**
 * Status Summary Component
 * Shows overall system health
 */
export function StatusSummary({
  status,
  message
}: {
  status: 'operational' | 'warning' | 'error'
  message: string
}) {
  const statusConfig = {
    operational: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✅' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠️' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '❌' }
  }

  const config = statusConfig[status]

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 flex items-center gap-3`}>
      <span className="text-2xl">{config.icon}</span>
      <div>
        <p className={`font-semibold ${config.text} capitalize`}>{status}</p>
        <p className={`text-sm ${config.text}`}>{message}</p>
      </div>
    </div>
  )
}

/**
 * Data Table Component
 * Displays tabular data with pagination
 */
export function DataTable({
  columns,
  rows,
  loading
}: {
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, any>>
  loading?: boolean
}) {
  const [page, setPage] = useState(0)
  const pageSize = 10
  const totalPages = Math.ceil(rows.length / pageSize)
  const paginatedRows = rows.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={`${idx}-${col.key}`} className="px-4 py-2 text-sm text-gray-700">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Alert Component
 * Shows alert/notification messages
 */
export function Alert({
  type = 'info',
  title,
  message,
  onClose
}: {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  onClose?: () => void
}) {
  const typeConfig = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'ℹ️', text: 'text-blue-800' },
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', text: 'text-green-800' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', text: 'text-amber-800' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: '❌', text: 'text-red-800' }
  }

  const config = typeConfig[type]

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 flex items-start gap-3`}>
      <span className="text-xl mt-0.5">{config.icon}</span>
      <div className="flex-1">
        {title && <p className={`font-semibold ${config.text}`}>{title}</p>}
        <p className={`text-sm ${config.text}`}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`text-lg ${config.text} hover:opacity-70`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

/**
 * Loading Skeleton Component
 * Placeholder while data is loading
 */
export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-200 rounded h-20 animate-pulse" />
      ))}
    </div>
  )
}
