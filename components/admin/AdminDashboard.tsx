'use client'

import React, { useMemo } from 'react'
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
import { format } from 'date-fns'

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

export default AdminDashboard
