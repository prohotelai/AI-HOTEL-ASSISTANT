'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'

interface Permission {
  id: string
  key: string
  name: string
  description?: string
  group: string
  resource: string
  action: string
}

interface PermissionGroup {
  group: string
  permissions: Permission[]
}

interface RoleData {
  id: string
  name: string
  key: string
  level: number
  permissions: string[]
}

/**
 * Role Permissions Management Page
 * 
 * Features:
 * - View and edit permissions for a specific role
 * - Organize permissions by group (PMS, HK, Maintenance, etc.)
 * - Add/remove permissions from role
 * - Save changes with validation
 * - Show permission details (resource, action)
 */
export default function RolePermissionsPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const roleId = params.id as string

  const [role, setRole] = useState<RoleData | null>(null)
  const [availablePermissions, setAvailablePermissions] = useState<PermissionGroup[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['pms']))
  const [hasChanges, setHasChanges] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchRoleAndPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch role details
      const roleResponse = await fetch(`/api/rbac/roles/${roleId}`)
      if (!roleResponse.ok) throw new Error('Failed to fetch role')
      const roleData = await roleResponse.json()
      setRole(roleData.role)
      setSelectedPermissions(new Set(roleData.role.permissions || []))

      // Fetch all available permissions
      const permsResponse = await fetch('/api/rbac/permissions')
      if (!permsResponse.ok) throw new Error('Failed to fetch permissions')
      const permsData = await permsResponse.json()

      // Group permissions by group
      const grouped = (permsData.permissions || []).reduce((acc: Record<string, Permission[]>, perm: Permission) => {
        if (!acc[perm.group]) acc[perm.group] = []
        acc[perm.group].push(perm)
        return acc
      }, {})

      const groupedArray = Object.entries(grouped).map(([group, permissions]) => ({
        group,
        permissions: permissions as Permission[]
      }))

      setAvailablePermissions(groupedArray)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [roleId])

  const hasSessionUser = Boolean(session?.user)

  // Fetch role and permissions
  useEffect(() => {
    if (hasSessionUser && roleId) {
      void fetchRoleAndPermissions()
    }
  }, [fetchRoleAndPermissions, hasSessionUser, roleId])

  function togglePermission(permissionId: string) {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
    setHasChanges(true)
  }

  function toggleGroup(group: string) {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) {
      newExpanded.delete(group)
    } else {
      newExpanded.add(group)
    }
    setExpandedGroups(newExpanded)
  }

  async function handleSave() {
    if (!role) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/rbac/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: Array.from(selectedPermissions)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save permissions')
      }

      setHasChanges(false)
      alert('Permissions updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Role not found</p>
      </div>
    )
  }

  const permissionCount = selectedPermissions.size
  const totalPermissions = availablePermissions.reduce((sum, g) => sum + g.permissions.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Permissions: {role.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {permissionCount} of {totalPermissions} permissions selected
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Permissions List */}
        <div className="space-y-4">
          {availablePermissions.map((group) => (
            <div key={group.group} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.group)}
                className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between border-b border-gray-200"
              >
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {group.group}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {group.permissions.filter(p => selectedPermissions.has(p.id)).length} of {group.permissions.length} selected
                  </p>
                </div>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    expandedGroups.has(group.group) ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Permissions */}
              {expandedGroups.has(group.group) && (
                <div className="divide-y divide-gray-200">
                  {group.permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="px-6 py-4 flex items-start hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.has(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-grow">
                        <div className="flex items-center">
                          <code className="text-sm font-mono text-blue-600">
                            {permission.key}
                          </code>
                          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                            {permission.resource}:{permission.action}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {permission.name}
                        </p>
                        {permission.description && (
                          <p className="mt-1 text-xs text-gray-500">
                            {permission.description}
                          </p>
                        )}
                      </div>
                      {selectedPermissions.has(permission.id) && (
                        <CheckIcon className="h-5 w-5 text-green-500 ml-2 flex-shrink-0 mt-1" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Button (Sticky) */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {permissionCount} permissions selected
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
