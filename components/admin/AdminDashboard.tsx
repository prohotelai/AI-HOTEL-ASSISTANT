'use client'

import React, { useMemo, useState } from 'react'
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminDashboardData } from '@/lib/services/adminService'
import { OnboardingProgressWidget } from '@/components/onboarding/OnboardingProgressWidget'
import type { OnboardingProgressData } from '@/lib/services/onboarding/onboardingStepService'
import { format } from 'date-fns'
import { AlertCircle, Download, Loader, QrCode, User, Users, Key, Settings, Building2, Zap, GitBranch, BarChart3, Phone, Webhook, Clock, Package, BookOpen, ArrowRight } from 'lucide-react'

const PIE_COLORS = ['#2563EB', '#14B8A6', '#F97316', '#F43F5E', '#6366F1']
type TicketStatusKey = AdminDashboardData['tickets'][number]['status'] extends never
  ? string
  : AdminDashboardData['tickets'][number]['status']
type TicketPriorityKey = AdminDashboardData['tickets'][number]['priority'] extends never
  ? string
  : AdminDashboardData['tickets'][number]['priority']
type BookingStatusKey = AdminDashboardData['bookings'][number]['status'] extends never
  ? string
  : AdminDashboardData['bookings'][number]['status']
type KnowledgeStatusKey = AdminDashboardData['knowledgeBaseDocuments'][number]['status'] extends never
  ? string
  : AdminDashboardData['knowledgeBaseDocuments'][number]['status']

const KNOWLEDGE_COLORS: Record<KnowledgeStatusKey | string, string> = {
  PENDING_EMBEDDING: 'bg-amber-100 text-amber-700',
  EMBEDDING: 'bg-blue-100 text-blue-700',
  READY: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
}

const TICKET_STATUS_COLOR: Record<TicketStatusKey | string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  ON_HOLD: 'bg-slate-100 text-slate-600',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-200 text-slate-600',
}

const TICKET_PRIORITY_COLOR: Record<TicketPriorityKey | string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-sky-600',
  HIGH: 'text-amber-600',
  URGENT: 'text-rose-600',
}

const BOOKING_STATUS_COLOR: Record<BookingStatusKey | string, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-emerald-100 text-emerald-700',
  CHECKED_OUT: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-600',
}

type AdminDashboardProps = {
  data: AdminDashboardData
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy')
}

function humanize(value: string) {
  return value.replace(/_/g, ' ')
}

function formatCurrency(amount: number | null, currency: string | null, formatter: Intl.NumberFormat) {
  if (amount === null || amount === undefined) return '—'
  if (!currency) return formatter.format(amount / 100)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100)
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const defaultCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }),
    []
  )

  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgressData | null>(null)

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
              <h1 className="text-3xl font-semibold text-gray-900">{data.hotel.name}</h1>
              <p className="text-sm text-gray-500">Tenant created {formatDate(data.hotel.createdAt)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Staff" value={data.metrics.totalStaff} subLabel="Active team members" />
          <MetricCard label="Bookings" value={data.metrics.totalBookings} subLabel="All time" />
          <MetricCard
            label="Active bookings"
            value={data.metrics.activeBookings}
            subLabel="Pending & in-house"
          />
          <MetricCard label="Tickets" value={data.metrics.totalTickets} subLabel="Total submitted" />
          <MetricCard label="Open tickets" value={data.metrics.openTickets} subLabel="Needs attention" />
          <MetricCard
            label="Ready docs"
            value={data.metrics.readyDocuments}
            subLabel={`of ${data.metrics.knowledgeDocuments} documents`}
          />
        </section>

        {/* HOTEL SETUP & CONFIGURATION SECTION */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hotel Configuration</h2>
            <p className="text-gray-600">Manage your hotel setup and core settings</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard
              icon={<Building2 className="w-6 h-6" />}
              title="Hotel Details"
              description="Configure basic hotel information and contact details"
              onClick={() => navigateTo('/dashboard/admin/settings')}
              color="blue"
            />
            <DashboardCard
              icon={<Package className="w-6 h-6" />}
              title="Room Configuration"
              description="Manage room types and inventory"
              onClick={() => navigateTo('/dashboard/admin/rooms')}
              color="purple"
            />
            <DashboardCard
              icon={<Zap className="w-6 h-6" />}
              title="Automation Rules"
              description="Set up automated operations and workflows"
              onClick={() => navigateTo('/dashboard/admin/automation')}
              color="amber"
            />
          </div>
        </section>

        {/* PMS INTEGRATION SECTION */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">PMS Integration</h2>
            <p className="text-gray-600">Connect and sync with your Property Management System</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              icon={<GitBranch className="w-6 h-6" />}
              title="PMS Configuration"
              description="Configure PMS connection settings and credentials"
              onClick={() => navigateTo('/dashboard/admin/pms/integration')}
              color="emerald"
            />
            <DashboardCard
              icon={<Webhook className="w-6 h-6" />}
              title="PMS Sync Status"
              description="Monitor real-time PMS synchronization and logs"
              onClick={() => navigateTo('/dashboard/admin/pms')}
              color="blue"
            />
            <DashboardCard
              icon={<Clock className="w-6 h-6" />}
              title="Sync Operations"
              description="Trigger manual sync and view operation history"
              onClick={() => navigateTo('/dashboard/admin/pms/connect')}
              color="cyan"
            />
          </div>
        </section>

        {/* GUEST & CRM SECTION */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Guest & CRM Management</h2>
            <p className="text-gray-600">Manage guests, reservations and customer relationships</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              icon={<User className="w-6 h-6" />}
              title="Guest Profiles"
              description="View and manage guest information and history"
              onClick={() => navigateTo('/dashboard/admin/guests')}
              color="pink"
            />
            <DashboardCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Bookings & Reservations"
              description="Manage all bookings and reservation data"
              onClick={() => navigateTo('/dashboard/admin/bookings')}
              color="indigo"
            />
            <DashboardCard
              icon={<Phone className="w-6 h-6" />}
              title="Guest Communications"
              description="Track guest interactions and communications"
              onClick={() => navigateTo('/dashboard/admin/communications')}
              color="orange"
            />
          </div>
        </section>

        {/* OPERATIONS & SUPPORT SECTION */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Operations & Support</h2>
            <p className="text-gray-600">Manage staff, QR codes, tickets and system operations</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              icon={<QrCode className="w-6 h-6" />}
              title="QR Codes"
              description="Generate and manage QR codes for guest access"
              onClick={() => navigateTo('/dashboard/admin/qr')}
              color="blue"
            />
            <DashboardCard
              icon={<Users className="w-6 h-6" />}
              title="Staff Management"
              description="Manage staff members and permissions"
              onClick={() => navigateTo('/dashboard/admin/staff')}
              color="green"
            />
            <DashboardCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Support Tickets"
              description="View and manage support tickets"
              onClick={() => navigateTo('/dashboard/admin/tickets')}
              color="red"
            />
            <DashboardCard
              icon={<Key className="w-6 h-6" />}
              title="Access Control"
              description="Manage roles, permissions and access"
              onClick={() => navigateTo('/dashboard/admin/rbac/roles')}
              color="purple"
            />
          </div>
        </section>

        {/* ANALYTICS & INSIGHTS SECTION */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Insights</h2>
            <p className="text-gray-600">View detailed reports and business intelligence</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Revenue Analytics"
              description="Track revenue, occupancy and performance metrics"
              onClick={() => navigateTo('/dashboard/admin/analytics')}
              color="emerald"
            />
            <DashboardCard
              icon={<Download className="w-5 h-5" />}
              title="Reports & Exports"
              description="Generate custom reports and export data"
              onClick={() => navigateTo('/dashboard/admin/reports')}
              color="slate"
            />
            <DashboardCard
              icon={<AlertCircle className="w-6 h-6" />}
              title="System Health"
              description="Monitor system performance and alerts"
              onClick={() => navigateTo('/dashboard/admin/health')}
              color="yellow"
            />
          </div>
        </section>

        {/* Onboarding progress widget - only show if not completed */}
        {onboardingProgress?.status !== 'COMPLETED' && (
          <OnboardingProgressWidget onOnboardingChange={setOnboardingProgress} />
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="bg-white rounded-xl border p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Booking pipeline</h2>
              <span className="text-xs text-gray-400">Last 6 months</span>
            </div>
            <div className="h-64">
              {data.bookingTrend.some((point) => point.bookings > 0) ? (
                <ResponsiveContainer>
                  <LineChart data={data.bookingTrend}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Line type="monotone" dataKey="bookings" stroke="#2563EB" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No booking activity yet" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket status</h2>
            <div className="h-64">
              {data.ticketStatusBreakdown.some((entry) => entry.value > 0) ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.ticketStatusBreakdown}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {data.ticketStatusBreakdown.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No ticket data yet" />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team members</h2>
            <Table
              headers={['Name', 'Email', 'Role', 'Joined']}
              rows={data.staff.map((member) => [
                member.name ?? '—',
                member.email,
                <span key="role" className="uppercase text-xs font-semibold text-gray-500">
                  {member.role}
                </span>,
                formatDate(member.joinedAt),
              ])}
              emptyMessage="No staff members yet"
            />
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Knowledge base health</h2>
            <ul className="space-y-3">
              {data.knowledgeStatusBreakdown.map((entry) => (
                <li key={entry.label} className="flex items-center justify-between text-sm">
                  <span>{humanize(entry.label)}</span>
                  <span className="font-semibold">{entry.value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              {data.knowledgeBaseDocuments.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2" title={doc.title}>
                    {doc.title}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      KNOWLEDGE_COLORS[doc.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {humanize(doc.status)}
                  </span>
                </div>
              ))}
              {data.knowledgeBaseDocuments.length === 0 && (
                <EmptyState message="No documents ingested" compact />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent bookings</h2>
            <Table
              headers={['Guest', 'Stay', 'Status', 'Room', 'Total']}
              rows={data.bookings.map((booking) => [
                booking.guestName,
                `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}`,
                <span
                  key="status"
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    BOOKING_STATUS_COLOR[booking.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {humanize(booking.status)}
                </span>,
                booking.roomNumber ?? '—',
                formatCurrency(booking.totalAmount, booking.currency, defaultCurrencyFormatter),
              ])}
              emptyMessage="No bookings captured yet"
            />
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket queue</h2>
            <Table
              headers={['Title', 'Status', 'Priority', 'Created']}
              rows={data.tickets.map((ticket) => [
                ticket.title,
                <span
                  key="status"
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    TICKET_STATUS_COLOR[ticket.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {humanize(ticket.status)}
                </span>,
                <span
                  key="priority"
                  className={`uppercase text-xs font-semibold ${
                    TICKET_PRIORITY_COLOR[ticket.priority] ?? 'text-gray-500'
                  }`}
                >
                  {ticket.priority}
                </span>,
                formatDate(ticket.createdAt),
              ])}
              emptyMessage="No tickets recorded"
            />
          </div>
        </section>
      </main>
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: number
  subLabel?: string
}

function MetricCard({ label, value, subLabel }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
      {subLabel ? <p className="text-xs text-gray-400 mt-1">{subLabel}</p> : null}
    </div>
  )
}

type TableProps = {
  headers: string[]
  rows: Array<Array<React.ReactNode>>
  emptyMessage: string
}

function Table({ headers, rows, emptyMessage }: TableProps) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 uppercase text-xs tracking-wider">
            {headers.map((header) => (
              <th key={header} className="pb-2 pr-4 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="text-gray-800">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type EmptyStateProps = {
  message: string
  compact?: boolean
}

function EmptyState({ message, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex items-center justify-center text-sm text-gray-400 rounded-lg border border-dashed border-gray-200 bg-gray-50 ${
        compact ? 'py-4' : 'py-12'
      }`}
    >
      {message}
    </div>
  )
}

type ControlCardProps = {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  loading?: boolean
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

const colorClasses = {
  blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
  purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
}

function ControlCard({
  icon,
  label,
  description,
  onClick,
  loading = false,
  color = 'blue',
}: ControlCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`p-4 rounded-lg border text-left transition-colors ${colorClasses[color]} ${
        loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs opacity-75 mt-1">{description}</p>
        </div>
      </div>
    </button>
  )
}

type StatusItemProps = {
  label: string
  status: 'healthy' | 'warning' | 'error'
}

function StatusItem({ label, status }: StatusItemProps) {
  const statusColors = {
    healthy: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
  }

  const statusDots = {
    healthy: '🟢',
    warning: '🟡',
    error: '🔴',
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
        {statusDots[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  )
}

type DashboardCardProps = {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'pink' | 'red' | 'cyan' | 'amber' | 'yellow' | 'slate'
}

const dashboardCardColors: Record<string, string> = {
  blue: 'hover:shadow-blue-100 border-blue-200 hover:border-blue-300 bg-blue-50/50',
  green: 'hover:shadow-green-100 border-green-200 hover:border-green-300 bg-green-50/50',
  emerald: 'hover:shadow-emerald-100 border-emerald-200 hover:border-emerald-300 bg-emerald-50/50',
  purple: 'hover:shadow-purple-100 border-purple-200 hover:border-purple-300 bg-purple-50/50',
  indigo: 'hover:shadow-indigo-100 border-indigo-200 hover:border-indigo-300 bg-indigo-50/50',
  pink: 'hover:shadow-pink-100 border-pink-200 hover:border-pink-300 bg-pink-50/50',
  red: 'hover:shadow-red-100 border-red-200 hover:border-red-300 bg-red-50/50',
  cyan: 'hover:shadow-cyan-100 border-cyan-200 hover:border-cyan-300 bg-cyan-50/50',
  orange: 'hover:shadow-orange-100 border-orange-200 hover:border-orange-300 bg-orange-50/50',
  amber: 'hover:shadow-amber-100 border-amber-200 hover:border-amber-300 bg-amber-50/50',
  yellow: 'hover:shadow-yellow-100 border-yellow-200 hover:border-yellow-300 bg-yellow-50/50',
  slate: 'hover:shadow-slate-100 border-slate-200 hover:border-slate-300 bg-slate-50/50',
}

const dashboardIconColors: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  emerald: 'text-emerald-600',
  purple: 'text-purple-600',
  indigo: 'text-indigo-600',
  pink: 'text-pink-600',
  red: 'text-red-600',
  cyan: 'text-cyan-600',
  orange: 'text-orange-600',
  amber: 'text-amber-600',
  yellow: 'text-yellow-600',
  slate: 'text-slate-600',
}

function DashboardCard({ icon, title, description, onClick, color = 'blue' }: DashboardCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border p-6 text-left transition-all hover:shadow-lg ${dashboardCardColors[color]}`}
    >
      <div className={`${dashboardIconColors[color]} mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex items-center text-sm font-medium text-gray-600 group-hover:text-gray-900">
        Go to <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </button>
  )
}

export default AdminDashboard
