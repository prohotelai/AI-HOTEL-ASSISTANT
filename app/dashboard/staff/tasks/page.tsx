'use client'

import { useEffect, useState } from 'react'
import { DataTable, MetricCard, StatusSummary, Alert } from '@/components/pms/DashboardComponents'

interface HousekeepingTask {
  id: string
  roomId: string
  roomNumber: string
  taskType: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'
  instructions: string
  date: string
  assignedTo?: string
}

export default function StaffPortal() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    pending: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pms/housekeeping')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      const tasks = data.tasks || []
      setTasks(tasks)

      // Calculate stats
      setStats({
        total: tasks.length,
        pending: tasks.filter((t: HousekeepingTask) => t.status === 'PENDING').length,
        inProgress: tasks.filter((t: HousekeepingTask) => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter((t: HousekeepingTask) => t.status === 'COMPLETED').length
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [])

  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter((t) => t.status === 'PENDING')
      case 'in-progress':
        return tasks.filter((t) => t.status === 'IN_PROGRESS')
      case 'completed':
        return tasks.filter((t) => t.status === 'COMPLETED')
      default:
        return tasks
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '🔴'
      case 'HIGH':
        return '🟠'
      case 'NORMAL':
        return '🟡'
      case 'LOW':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⏱️' },
      ASSIGNED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📋' },
      IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🔄' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' }
    }
    const config = statusConfig[status] || statusConfig.PENDING
    return `${config.icon} ${status}`
  }

  const filteredTasks = getFilteredTasks()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Portal</h1>
          <p className="text-gray-600">Manage your assigned housekeeping and maintenance tasks</p>
        </div>

        {/* Status */}
        <div className="mb-6">
          <StatusSummary
            status={stats.inProgress > 0 ? 'warning' : stats.pending > 0 ? 'warning' : 'operational'}
            message={
              stats.inProgress > 0
                ? `${stats.inProgress} task(s) in progress`
                : stats.pending > 0
                  ? `${stats.pending} pending task(s) waiting for assignment`
                  : 'All assigned tasks completed'
            }
          />
        </div>

        {/* Metrics */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Tasks"
            value={stats.total}
            icon="📋"
            color="blue"
          />
          <MetricCard
            title="Pending"
            value={stats.pending}
            icon="⏱️"
            color="red"
          />
          <MetricCard
            title="In Progress"
            value={stats.inProgress}
            icon="🔄"
            color="amber"
          />
          <MetricCard
            title="Completed"
            value={stats.completed}
            icon="✅"
            color="green"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === 'in-progress'
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading tasks...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {filter === 'all' ? 'No tasks assigned' : `No ${filter} tasks`}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getPriorityColor(task.priority)} Room {task.roomNumber}
                      </h3>
                      <p className="text-sm text-gray-600">{task.taskType}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border">
                      <span>{getStatusBadge(task.status)}</span>
                    </div>
                  </div>

                  {task.instructions && (
                    <p className="text-sm text-gray-700 mb-3 bg-white p-2 rounded border-l-4 border-blue-400">
                      {task.instructions}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <p>Task ID: {task.id.substring(0, 8)}...</p>
                    <p>{new Date(task.date).toLocaleDateString()}</p>
                  </div>

                  <button className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
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
