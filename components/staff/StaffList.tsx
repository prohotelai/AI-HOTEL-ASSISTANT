/**
 * Staff List Component - Display staff members in a table
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Mail, Phone, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Models not in schema yet
type User = { id: string; email: string; name: string | null; role: string }
type Department = { id: string; name: string; color?: string | null }
type StaffProfile = { 
  id: string
  userId: string
  departmentId: string
  firstName: string
  lastName: string
  position?: string | null
  phone?: string | null
  phoneNumber?: string | null
  employmentStatus?: string | null
  hireDate?: Date | null
  startDate?: Date | null
  employeeId?: string | null
}

type StaffWithRelations = StaffProfile & {
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>
  department: Department | null
}

interface StaffListProps {
  staff: StaffWithRelations[]
  departments: (Department & { _count: { staffProfiles: number } })[]
  onInviteClick?: () => void
  canInvite: boolean
}

const EmploymentStatusBadge = ({ status }: { status: string }) => {
  const colors = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    ON_LEAVE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
    PROBATION: 'bg-blue-100 text-blue-800 border-blue-200',
    TERMINATED: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.ACTIVE}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function StaffList({ staff, departments, onInviteClick, canInvite }: StaffListProps) {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = search === '' || 
      member.firstName.toLowerCase().includes(search.toLowerCase()) ||
      member.lastName.toLowerCase().includes(search.toLowerCase()) ||
      member.user.email.toLowerCase().includes(search.toLowerCase()) ||
      member.position?.toLowerCase().includes(search.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || 
      member.departmentId === departmentFilter
    
    const matchesStatus = statusFilter === 'all' || 
      member.employmentStatus === statusFilter
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept._count.staffProfiles})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="PROBATION">Probation</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          {/* Invite Button */}
          {canInvite && onInviteClick && (
            <Button onClick={onInviteClick} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Mail className="h-4 w-4 mr-2" />
              Invite Staff
            </Button>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStaff.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.employeeId || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.position || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{member.user.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.department ? (
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: member.department.color || '#3B82F6' }}
                      />
                      <span className="text-sm text-gray-900">{member.department.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No department</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-sm text-gray-900">
                      <Mail className="h-3 w-3 mr-1 text-gray-400" />
                      {member.user.email}
                    </div>
                    {member.phoneNumber && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        {member.phoneNumber}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <EmploymentStatusBadge status={member.employmentStatus || 'active'} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.startDate ? (
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                      {new Date(member.startDate).toLocaleDateString()}
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/dashboard/admin/staff/${member.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredStaff.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredStaff.length}</span> of{' '}
            <span className="font-medium">{staff.length}</span> staff members
          </p>
        </div>
      )}
    </div>
  )
}
