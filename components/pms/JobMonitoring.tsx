'use client'

import { useState, useEffect } from 'react'

interface JobExecution {
  id: string
  jobName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  metadata?: Record<string, any>
  error?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

interface JobStatusProps {
  jobName: string
  status: JobExecution['status']
  error?: string
  metadata?: Record<string, any>
}

/**
 * Job Status Indicator Component
 * Shows visual status of a job execution
 */
export function JobStatusBadge({ status, error }: { status: JobExecution['status']; error?: string }) {
  const statusConfig = {
    PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⏱️' },
    RUNNING: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '⚙️' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
    FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' }
  }

  const config = statusConfig[status]

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} ${config.text} text-sm font-medium`}>
      <span>{config.icon}</span>
      <span>{status}</span>
      {error && <span title={error} className="ml-1">⚠️</span>}
    </div>
  )
}

/**
 * Job Execution Card Component
 * Displays details of a single job execution
 */
export function JobExecutionCard({ job }: { job: JobExecution }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{job.jobName}</h3>
          <p className="text-xs text-gray-500">ID: {job.id.substring(0, 8)}...</p>
        </div>
        <JobStatusBadge status={job.status} error={job.error} />
      </div>

      <div className="space-y-1 text-sm text-gray-600 mb-3">
        <p>Created: {new Date(job.createdAt).toLocaleString()}</p>
        {job.startedAt && <p>Started: {new Date(job.startedAt).toLocaleString()}</p>}
        {job.completedAt && <p>Completed: {new Date(job.completedAt).toLocaleString()}</p>}
      </div>

      {job.metadata && (
        <div className="bg-gray-50 rounded p-2 text-xs mb-2">
          <p className="font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(job.metadata, null, 2)}
          </p>
        </div>
      )}

      {job.error && (
        <div className="bg-red-50 rounded p-2 text-xs text-red-700 font-mono">
          {job.error}
        </div>
      )}
    </div>
  )
}

/**
 * Job Monitoring List Component
 * Displays paginated list of job executions
 */
export function JobMonitoringList({ jobs, loading, onRefresh }: { 
  jobs: JobExecution[]; 
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Job Executions</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No job executions found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobExecutionCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Job Statistics Component
 * Shows aggregated job statistics
 */
export function JobStatistics({
  stats
}: {
  stats?: {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    successRate: number
    period: string
  }
}) {
  if (!stats) {
    return <div className="text-gray-500">Loading statistics...</div>
  }

  const pendingJobs = stats.totalJobs - stats.completedJobs - stats.failedJobs

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-xs text-blue-600 font-semibold uppercase">Total Jobs</p>
        <p className="text-2xl font-bold text-blue-900">{stats.totalJobs}</p>
        <p className="text-xs text-blue-600 mt-1">Last 30 days</p>
      </div>

      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <p className="text-xs text-green-600 font-semibold uppercase">Completed</p>
        <p className="text-2xl font-bold text-green-900">{stats.completedJobs}</p>
        <p className="text-xs text-green-600 mt-1">{((stats.completedJobs / stats.totalJobs) * 100 || 0).toFixed(0)}%</p>
      </div>

      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <p className="text-xs text-red-600 font-semibold uppercase">Failed</p>
        <p className="text-2xl font-bold text-red-900">{stats.failedJobs}</p>
        <p className="text-xs text-red-600 mt-1">{((stats.failedJobs / stats.totalJobs) * 100 || 0).toFixed(0)}%</p>
      </div>

      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <p className="text-xs text-amber-600 font-semibold uppercase">Success Rate</p>
        <p className="text-2xl font-bold text-amber-900">{stats.successRate.toFixed(1)}%</p>
        <p className="text-xs text-amber-600 mt-1">Success ratio</p>
      </div>
    </div>
  )
}

/**
 * Job Trigger Button Component
 * Allows triggering a specific job
 */
export function JobTriggerButton({
  jobName,
  onSuccess,
  onError
}: {
  jobName: string
  onSuccess?: (result: any) => void
  onError?: (error: any) => void
}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTrigger = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/jobs/trigger/${jobName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger job')
      }

      setResult(data)
      onSuccess?.(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error'
      setError(errorMsg)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleTrigger}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
      >
        {loading ? 'Triggering...' : `Trigger ${jobName}`}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700">
          Job triggered successfully
        </div>
      )}
    </div>
  )
}
