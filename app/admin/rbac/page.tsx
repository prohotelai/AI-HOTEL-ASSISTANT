'use client'

import { useState } from 'react'
import { ShieldCheck, Users, UserCheck, AlertCircle, CheckCircle } from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

const roles: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to all hotel operations and settings',
    permissions: ['all']
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Manage hotel operations, staff, and settings',
    permissions: ['manage_staff', 'manage_rooms', 'manage_bookings', 'view_reports']
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Oversee daily operations and staff',
    permissions: ['manage_bookings', 'view_reports', 'manage_housekeeping']
  },
  {
    id: 'reception',
    name: 'Reception',
    description: 'Handle guest check-ins, check-outs, and inquiries',
    permissions: ['manage_bookings', 'view_guest_info']
  },
  {
    id: 'staff',
    name: 'Staff',
    description: 'Perform assigned duties and tasks',
    permissions: ['view_assigned_tasks']
  }
]

const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@hotel.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@hotel.com', role: 'manager', status: 'active' },
  { id: '3', name: 'Bob Johnson', email: 'bob@hotel.com', role: 'reception', status: 'active' },
  { id: '4', name: 'Alice Brown', email: 'alice@hotel.com', role: 'staff', status: 'inactive' }
]

export default function RBACPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [selectedRole, setSelectedRole] = useState<string>('admin')
  const [showAddUser, setShowAddUser] = useState(false)

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, role: newRole } : user
    ))
  }

  const handleStatusChange = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ))
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">RBAC & Permissions</h1>
          </div>
          <p className="text-slate-400">
            Manage user roles and permissions for your hotel staff
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Roles Overview */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Available Roles</h2>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-start gap-3">
                      <UserCheck className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-white">{role.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{role.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded"
                            >
                              {perm.replace('_', ' ')}
                            </span>
                          ))}
                          {role.permissions.length > 3 && (
                            <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                              +{role.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Staff Members</h2>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add User
                </button>
              </div>

              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{user.name}</h3>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleStatusChange(user.id)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            user.status === 'active'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {user.status === 'active' ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Inactive
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add User Modal Placeholder */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Add New User</h3>
              <p className="text-slate-400 mb-4">
                User invitation system would be implemented here.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
