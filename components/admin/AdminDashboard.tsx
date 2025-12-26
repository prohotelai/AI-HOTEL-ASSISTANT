'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
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
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Clock,
  Download,
  GitBranch,
  Key,
  Package,
  QrCode,
  Settings,
  Ticket,
  User,
  Users,
  Webhook,
  Wand2,
  Zap,
} from 'lucide-react'

const PIE_COLORS = ['#2563EB', '#14B8A6', '#F97316', '#F43F5E', '#6366F1']

type AdminDashboardProps = {
  data: AdminDashboardData
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy')
}

function humanize(value: string) {
  return value.replace(/_/g, ' ')
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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10">
        {/* HEADER */}
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-300/80">Admin Control Center</p>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-semibold sm:text-4xl">{data.hotel.name}</h1>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                Created {formatDate(data.hotel.createdAt)}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-white/70">
              Manage your hotel operations, staff, reservations, and integrations all from one control center.
            </p>
          </div>
        </header>

        {/* KPI CARDS */}
        <section className="grid gap-6 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="h-8 w-8 text-blue-300" />}
            label="Staff Members"
            value={data.metrics.totalStaff}
            change="Active team"
          />
          <MetricCard
            icon={<BarChart3 className="h-8 w-8 text-emerald-300" />}
            label="Active Bookings"
            value={data.metrics.activeBookings}
            change={`${data.metrics.totalBookings} total`}
          />
          <MetricCard
            icon={<Ticket className="h-8 w-8 text-orange-300" />}
            label="Open Tickets"
            value={data.metrics.openTickets}
            change={`${data.metrics.totalTickets} total`}
          />
          <MetricCard
            icon={<BookOpen className="h-8 w-8 text-purple-300" />}
            label="KB Documents Ready"
            value={data.metrics.readyDocuments}
            change={`${data.metrics.knowledgeDocuments} total`}
          />
        </section>

        {/* CHARTS */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Booking Trend (6 months)</h2>
            <div className="h-64">
              {data.bookingTrend.some((point) => point.bookings > 0) ? (
                <ResponsiveContainer>
                  <LineChart data={data.bookingTrend}>
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#fff' }} stroke="#fff/20" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#fff' }} stroke="#fff/20" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50">No booking data yet</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold">Ticket Status</h2>
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
                <div className="flex items-center justify-center h-full text-white/50">No ticket data yet</div>
              )}
            </div>
          </div>
        </section>

        {/* NAVIGATION GRID */}
        <section className="space-y-10">
          {/* HOTEL SETUP - Temporarily Hidden */}
          {/* Coming Soon: Hotel Configuration section */}

          {/* PMS INTEGRATION - Temporarily Hidden */}
          {/* Coming Soon: PMS Integration section */}

          {/* OPERATIONS - Temporarily Hidden */}
          {/* Coming Soon: Operations & Support section */}

          {/* DATA TABLES */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-white/60 uppercase text-xs">
                      <th className="pb-2 text-left">Guest</th>
                      <th className="pb-2 text-left">Stay</th>
                      <th className="pb-2 text-left">Status</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.bookings.slice(0, 5).map((booking) => (
                      <tr key={booking.id} className="hover:bg-white/5">
                        <td className="py-3 text-white">{booking.guestName}</td>
                        <td className="py-3 text-white/70 text-xs">{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</td>
                        <td className="py-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-200">{booking.status}</span></td>
                        <td className="py-3 text-right text-white">{defaultCurrencyFormatter.format((booking.totalAmount || 0) / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.bookings.length === 0 && <p className="text-white/50 text-center py-4">No bookings yet</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-semibold">Ticket Queue</h2>
              <div className="space-y-3">
                {data.tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{ticket.title}</p>
                      <p className="text-xs text-white/60">{formatDate(ticket.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-200">{ticket.priority}</span>
                      <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-200">{ticket.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              {data.tickets.length === 0 && <p className="text-white/50 text-center py-4">No tickets yet</p>}
            </div>
          </section>

          {/* STAFF DIRECTORY */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold">Team Members</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.staff.map((member) => (
                <div key={member.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <p className="font-semibold text-white">{member.name || 'Unknown'}</p>
                  <p className="text-xs text-white/60 truncate">{member.email}</p>
                  <p className="text-xs text-blue-300 mt-2 uppercase tracking-wider">{member.role}</p>
                </div>
              ))}
            </div>
            {data.staff.length === 0 && <p className="text-white/50 text-center py-4">No staff members yet</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

type MetricCardProps = {
  icon: React.ReactNode
  label: string
  value: number
  change: string
}

function MetricCard({ icon, label, value, change }: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur hover:bg-white/10 transition">
      <div className="text-blue-300 mb-6">{icon}</div>
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-white/60">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-xs text-white/50">{change}</p>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </article>
  )
}

type NavCardProps = {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

function NavCard({ icon, title, description, href }: NavCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition group"
    >
      <div className="text-blue-300 mb-3 group-hover:text-blue-200 transition">{icon}</div>
      <h3 className="font-semibold text-white mb-1 group-hover:text-blue-200 transition">{title}</h3>
      <p className="text-sm text-white/60 mb-3">{description}</p>
      <div className="flex items-center text-xs text-blue-300 opacity-0 group-hover:opacity-100 transition">
        Go to <ArrowRight className="w-3 h-3 ml-1" />
      </div>
    </Link>
  )
}

export default AdminDashboard
