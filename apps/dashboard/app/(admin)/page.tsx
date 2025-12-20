import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { BarChart3, FileText, Settings, Ticket, Users } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, hasPermission, Permission } from '@/lib/rbac'
import { getAdminDashboardData } from '@/lib/services/adminService'
import { Button } from '@/components/ui/button'

// TODO(decision): Confirm analytics data retention window (default 90 days).
// TODO(decision): Confirm real-time updates strategy (polling vs WebSocket; default polling).

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const isSuperadmin = role === 'superadmin'
  const canManage = hasPermission(role, Permission.ADMIN_MANAGE) || isSuperadmin

  const data = await getAdminDashboardData(hotelId)

  const kpis = [
    {
      label: 'Team Members',
      value: data.metrics.totalStaff,
      change: '+12% vs last month',
      icon: Users,
    },
    {
      label: 'Active Bookings',
      value: data.metrics.activeBookings,
      change: '+5 new today',
      icon: BarChart3,
    },
    {
      label: 'Open Tickets',
      value: data.metrics.openTickets,
      change: 'SLA avg 1h 10m',
      icon: Ticket,
    },
    {
      label: 'Knowledge Docs Ready',
      value: data.metrics.readyDocuments,
      change: `${data.metrics.knowledgeDocuments} total`,
      icon: FileText,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-300/80">Admin Control Center</p>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-semibold sm:text-4xl">{data.hotel.name}</h1>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                Established {formatDistanceToNow(new Date(data.hotel.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-white/70">
              Monitor operations, guide staff performance, and align service quality across every guest touchpoint.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/admin/tenants">
              <Button variant="outline" className="bg-white/5 text-white hover:bg-white/10">
                Manage Tenants
              </Button>
            </Link>
            <Link href="/dashboard/admin/staff">
              <Button variant="outline" className="bg-white/5 text-white hover:bg-white/10">
                Team Directory
              </Button>
            </Link>
            {canManage && (
              <Link href="/dashboard/admin/settings">
                <Button className="bg-blue-500 hover:bg-blue-400">
                  <Settings className="mr-2 h-4 w-4" />
                  System Settings
                </Button>
              </Link>
            )}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur"
            >
              <kpi.icon className="mb-6 h-8 w-8 text-blue-300" />
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-wide text-white/60">{kpi.label}</p>
                <p className="text-3xl font-semibold">{kpi.value}</p>
                <p className="text-xs text-white/50">{kpi.change}</p>
              </div>
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Booking Momentum</h2>
                <p className="text-xs text-white/60">Rolling 6 month trend</p>
              </div>
              <Button variant="ghost" className="text-xs text-white/70">
                Export CSV
              </Button>
            </div>
            <div className="mt-6 h-64 rounded-2xl border border-dashed border-white/10 bg-black/20" role="img" aria-label="Bookings trend chart placeholder">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-white/40">Loading chart…</div>}>
                <div className="flex h-full items-center justify-center text-sm text-white/50">
                  Charts powered by Recharts will render here.
                </div>
              </Suspense>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:col-span-2">
            <h2 className="text-lg font-semibold">Ticket Triage</h2>
            <p className="text-xs text-white/60">Current workload split</p>
            <div className="mt-6 h-64 rounded-2xl border border-dashed border-white/10 bg-black/20" role="img" aria-label="Tickets status breakdown placeholder">
              <div className="flex h-full items-center justify-center text-sm text-white/50">
                Ticket status chart placeholder.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Latest Bookings</h2>
              <Link href="/dashboard/admin/bookings" className="text-xs text-blue-300 hover:text-blue-200">
                View all
              </Link>
            </div>
            <ul className="mt-4 space-y-4">
              {data.bookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div>
                    <p className="text-sm font-medium">{booking.guestName}</p>
                    <p className="text-xs text-white/60">
                      {new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs uppercase text-white/60">{booking.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Knowledge Base Health</h2>
              <Link href="/dashboard/admin/knowledge-base" className="text-xs text-blue-300 hover:text-blue-200">
                Manage
              </Link>
            </div>
            <ul className="mt-4 space-y-4">
              {data.knowledgeBaseDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-white/60">Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</p>
                  </div>
                  <span className="text-xs uppercase text-white/60">{doc.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
