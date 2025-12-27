'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { JobStatusBadge, JobExecutionCard, JobMonitoringList, JobStatistics, JobTriggerButton } from '@/components/pms/JobMonitoring'
import { MetricCard, StatusSummary, DataTable, Alert } from '@/components/pms/DashboardComponents'

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

interface JobStats {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  successRate: number
  period: string
}

export default function PMSSetup() {
  const [jobs, setJobs] = useState<JobExecution[]>([])
  const [stats, setStats] = useState<JobStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const jobNames = [
    'daily-housekeeping-round',
    'maintenance-scheduler',
    'check-no-shows',
    'recalc-availability',
    'generate-invoices'
  ]

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch recent jobs
      const jobsRes = await fetch('/api/jobs?limit=10')
      if (!jobsRes.ok) throw new Error('Failed to fetch jobs')
      const jobsData = await jobsRes.json()
      setJobs(jobsData.jobs || [])

      // Fetch statistics
      const statsRes = await fetch('/api/jobs', { method: 'HEAD' })
      if (!statsRes.ok) throw new Error('Failed to fetch statistics')
      const statsData = await statsRes.json()
      setStats(statsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const runningJobs = jobs.filter((j) => j.status === 'RUNNING').length
  const failedJobs = jobs.filter((j) => j.status === 'FAILED').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PMS Setup</h1>
          <p className="text-gray-600">Monitor jobs, system health, and PMS operations</p>
        </div>

        {/* System Status */}
        <div className="mb-6">
          {failedJobs > 0 ? (
            <StatusSummary
              status="warning"
              message={`${failedJobs} job execution(s) failed. Check job history for details.`}
            />
          ) : runningJobs > 0 ? (
            <StatusSummary
              status="warning"
              message={`${runningJobs} job(s) currently running`}
            />
          ) : (
            <StatusSummary
              status="operational"
              message="All systems operational"
            />
          )}
        </div>

        {/* Metrics */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics (Last 30 Days)</h2>
            <JobStatistics stats={stats} />
          </div>
        )}

        {/* Job Triggers */}
        <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Job Triggers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobNames.map((jobName) => (
              <div key={jobName} className="border rounded p-4">
                <p className="font-medium text-gray-900 mb-2 text-sm">{jobName}</p>
                <JobTriggerButton
                  jobName={jobName}
                  onSuccess={() => {
                    // Refresh jobs after successful trigger
                    setTimeout(fetchData, 1000)
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Job Executions */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Job Executions</h2>
          <JobMonitoringList
            jobs={jobs.slice(0, 6)}
            loading={loading}
            onRefresh={fetchData}
          />
        </div>

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
