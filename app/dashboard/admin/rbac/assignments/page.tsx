'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  name?: string
  roles: string[]
  createdAt: string
}

interface Role {
  id: string
  name: string
  key: string
  level: number
}

/**
 * User Role Assignment Page
 * 
 * Features:
 * - View all users in the hotel
 * - Assign roles to users
 * - Remove roles from users
 * - Filter by role
 * - Search users
 * - Show role assignment history
 * - Pagination support
 */
export default function AssignmentsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch users
      const userParams = new URLSearchParams()
      if (searchQuery) userParams.append('search', searchQuery)
      if (filterRole !== 'all') userParams.append('role', filterRole)

      const usersResponse = await fetch(`/api/users?${userParams}`)
      if (!usersResponse.ok) throw new Error('Failed to fetch users')
      const usersData = await usersResponse.json()
      setUsers(usersData.users || [])

      // Fetch available roles
      const rolesResponse = await fetch('/api/rbac/roles')
      if (!rolesResponse.ok) throw new Error('Failed to fetch roles')
      const rolesData = await rolesResponse.json()
      setAvailableRoles(rolesData.roles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [filterRole, searchQuery])

  const hasSessionUser = Boolean(session?.user)

  // Fetch users and roles
  useEffect(() => {
    if (hasSessionUser) {
      void fetchData()
    }
  }, [fetchData, hasSessionUser])

  async function handleAssignRole() {
    if (!selectedUser || !selectedRole) return

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/rbac/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          roleKey: selectedRole
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to assign role')
      }

      setShowAssignModal(false)
      setSelectedUser(null)
      setSelectedRole('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveRole(userId: string, roleKey: string) {
    if (!confirm('Remove this role from the user?')) return

    try {
      const response = await fetch(`/api/rbac/users/${userId}/roles/${roleKey}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove role')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const roleLevels: Record<number, { label: string; color: string }> = {
    0: { label: 'Guest (L0)', color: 'bg-gray-100' },
    1: { label: 'Staff (L1)', color: 'bg-blue-100' },
    2: { label: 'Supervisor (L2)', color: 'bg-green-100' },
    3: { label: 'Manager (L3)', color: 'bg-yellow-100' },
    4: { label: 'Admin (L4)', color: 'bg-red-100' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Role Assignments</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage roles for {users.length} users
              </p>
            </div>
            <button
              onClick={() => {
                setShowAssignModal(true)
                setSelectedUser(null)
                setSelectedRole('')
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Assign Role
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.key}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              void fetchData()
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((roleKey) => {
                            const role = availableRoles.find(r => r.key === roleKey)
                            return (
                              <div key={roleKey} className="flex items-center gap-1">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    roleLevels[role?.level || 0]?.color || 'bg-gray-100'
                                  }`}
                                >
                                  {role?.name || roleKey}
                                </span>
                                {roleKey !== 'admin' && (
                                  <button
                                    onClick={() => handleRemoveRole(user.id, roleKey)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Remove role"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-gray-400 italic">No roles assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowAssignModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Assign Role
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Role to User</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value)
                  setSelectedUser(user || null)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a role...</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRole}
                disabled={!selectedUser || !selectedRole || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
