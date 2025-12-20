'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Staff Dashboard Main Page
 * Displays KPIs, task list, room status, and AI-powered tools
 */

type DashboardStats = {
  totalTasks: number
  assignedToMe: number
  completedToday: number
  pendingRooms: number
  maintenanceAlerts: number
  forecastedOccupancy: number
}

type AIModule = {
  id: string
  name: string
  description: string
  icon: string
  status: 'available' | 'busy' | 'error'
  lastUsed?: string
}

export default function StaffDashboard() {
  const router = useRouter()
  const { data: session } = useSession()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [aiModules, setAIModules] = useState<AIModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])

  useEffect(() => {
    const qrSession = localStorage.getItem('qr_session_user')
    const qrPermissions = localStorage.getItem('qr_session_permissions')

    if (qrSession) {
      const user = JSON.parse(qrSession)
      setUserRole(user.role)
    }

    if (qrPermissions) {
      setUserPermissions(JSON.parse(qrPermissions))
    }
  }, [])

  const hotelId = (session?.user as any)?.hotelId

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!hotelId) return
      
      const authToken = localStorage.getItem('qr_session_jwt')

      const response = await fetch(`/api/dashboard/staff/stats?hotelId=${hotelId}`, {
        headers: {
          Authorization: `Bearer ${authToken || ''}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch dashboard stats')

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      setLoading(false)
    }
  }, [hotelId])

  const fetchAIModulesStatus = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('qr_session_jwt')

      const response = await fetch('/api/ai/modules/status', {
        headers: {
          Authorization: `Bearer ${authToken || ''}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch AI modules')

      const modules: AIModule[] = await response.json()

      // Filter modules based on permissions
      const availableModules = modules.filter((module) => {
        const permissionKey = `ai:${module.id}`
        return userPermissions.includes(permissionKey)
      })

      setAIModules(availableModules)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load AI modules:', err)
      setLoading(false)
    }
  }, [userPermissions])

  useEffect(() => {
    void fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    void fetchAIModulesStatus()
  }, [fetchAIModulesStatus])

  const handleLogout = () => {
    localStorage.removeItem('qr_session_jwt')
    localStorage.removeItem('qr_session_user')
    localStorage.removeItem('qr_session_permissions')
    localStorage.removeItem('qr_session_expires')
    router.push('/dashboard/staff/qr-login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome, {userRole === 'staff' ? 'Staff Member' : 'User'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Tasks', value: stats.totalTasks, color: 'bg-blue-50 text-blue-900' },
              { label: 'Assigned to Me', value: stats.assignedToMe, color: 'bg-purple-50 text-purple-900' },
              { label: 'Completed Today', value: stats.completedToday, color: 'bg-green-50 text-green-900' },
              { label: 'Pending Rooms', value: stats.pendingRooms, color: 'bg-orange-50 text-orange-900' },
              { label: 'Maintenance Alerts', value: stats.maintenanceAlerts, color: 'bg-red-50 text-red-900' },
            ].map((stat, idx) => (
              <div key={idx} className={`${stat.color} rounded-lg p-6`}>
                <p className="text-sm font-medium opacity-75 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI Modules Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">AI-Powered Tools</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiModules.length > 0 ? (
              aiModules.map((module) => (
                <div key={module.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{module.icon}</div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        module.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : module.status === 'busy'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{module.description}</p>

                  <div className="flex gap-2">
                    <button className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                      Open
                    </button>
                    {module.lastUsed && (
                      <span className="text-xs text-gray-500 py-2">Last: {module.lastUsed}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No AI modules available for your role</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/dashboard/staff/tasks" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <h3 className="font-semibold text-gray-900">My Tasks</h3>
              <p className="text-sm text-gray-600">View and manage assigned tasks</p>
            </a>
            <a href="/dashboard/admin/pms" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <h3 className="font-semibold text-gray-900">PMS Integration</h3>
              <p className="text-sm text-gray-600">Property management system</p>
            </a>
            <a href="/dashboard/admin/tickets" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <h3 className="font-semibold text-gray-900">Tickets</h3>
              <p className="text-sm text-gray-600">Track support tickets</p>
            </a>
            <a href="/dashboard/admin/qr" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <h3 className="font-semibold text-gray-900">QR Management</h3>
              <p className="text-sm text-gray-600">Generate and manage QR codes</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
