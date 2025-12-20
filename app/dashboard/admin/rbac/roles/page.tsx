'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface RoleWithDetails {
  id: string
  name: string
  key: string
  level: number
  description?: string
  _count?: {
    permissions: number
    users: number
  }
}

interface PaginationState {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/**
 * Admin RBAC Roles Management Page
 * 
 * Features:
 * - List all roles for the hotel
 * - Create new custom roles
 * - Edit existing roles
 * - Delete roles (with confirmation)
 * - View permission count and user assignments
 * - Search and filter by role level
 * - Pagination support
 */
export default function RolesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [roles, setRoles] = useState<RoleWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: false
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state for creating/editing roles
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    level: 1,
    description: ''
  })

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { page, pageSize } = pagination

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        includePermissions: 'true'
      })

      if (searchQuery) params.append('search', searchQuery)
      if (filterLevel !== 'all') params.append('level', filterLevel.toString())

      const response = await fetch(`/api/rbac/roles?${params}`)
      
      if (response.status === 403) {
        router.push('/403')
        return
      }

      if (!response.ok) throw new Error('Failed to fetch roles')

      const data = await response.json()
      setRoles(data.roles || [])
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        hasMore: data.hasMore || false
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [filterLevel, page, pageSize, router, searchQuery])

  const hasSessionUser = Boolean(session?.user)

  // Fetch roles
  useEffect(() => {
    if (hasSessionUser) {
      void fetchRoles()
    }
  }, [fetchRoles, hasSessionUser])

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.name || !formData.key) {
      setError('Role name and key are required')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create role')
      }

      setShowCreateModal(false)
      setFormData({ name: '', key: '', level: 1, description: '' })
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteRole(roleId: string) {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete role')

      setDeleteConfirm(null)
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const roleLevels = {
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
              <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage roles, permissions, and role hierarchy for your hotel
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Role
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
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterLevel}
            onChange={(e) => {
              const value = e.target.value === 'all' ? 'all' : parseInt(e.target.value)
              setFilterLevel(value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="0">Guest (L0)</option>
            <option value="1">Staff (L1)</option>
            <option value="2">Supervisor (L2)</option>
            <option value="3">Manager (L3)</option>
            <option value="4">Admin (L4)</option>
          </select>
          <button
            onClick={() => {
              void fetchRoles()
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>

        {/* Roles Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No roles found
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {role.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {role.key}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleLevels[role.level as keyof typeof roleLevels].color}`}>
                        {roleLevels[role.level as keyof typeof roleLevels].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/dashboard/admin/rbac/roles/${role.id}/permissions`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {role._count?.permissions || 0} permissions
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role._count?.users || 0} users
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Link
                        href={`/dashboard/admin/rbac/roles/${role.id}/edit`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      {role.key !== 'admin' && role.key !== 'guest' && (
                        <button
                          onClick={() => setDeleteConfirm(role.id)}
                          className="inline-flex items-center text-red-600 hover:text-red-800"
                          disabled={isSubmitting}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Role</h3>
            <form onSubmit={handleCreateRole}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Team Lead"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Key *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., team-lead"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Guest (L0)</option>
                  <option value="1">Staff (L1)</option>
                  <option value="2">Supervisor (L2)</option>
                  <option value="3">Manager (L3)</option>
                  <option value="4">Admin (L4)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description of this role"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Role?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this role? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm) handleDeleteRole(deleteConfirm)
                }}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
