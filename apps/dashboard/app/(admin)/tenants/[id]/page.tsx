import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, CalendarCheck, MapPin, Ticket, Users } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { getTenantDetail } from '@/apps/dashboard/src/server/adminData'
import { Button } from '@/components/ui/button'

// TODO(decision): Confirm timezone display (default to hotel timezone when available).

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/tenants')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const isSuperadmin = role === 'superadmin'

  const tenant = await getTenantDetail(params.id, isSuperadmin, hotelId)

  if (!tenant) {
    notFound()
  }

  const bookings: any[] = [] // bookings relation doesn't exist yet
  const tickets: any[] = [] // tickets relation doesn't exist yet  
  const staff: any[] = [] // users relation doesn't exist yet

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <Link href="/dashboard/admin/tenants" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
            <ArrowLeft className="h-4 w-4" /> Back to tenants
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-blue-300/80">Tenant Overview</p>
              <h1 className="text-3xl font-semibold">{tenant.name}</h1>
              <p className="max-w-xl text-sm text-white/70">{tenant.description ?? 'No overview provided yet.'}</p>

              <div className="flex flex-wrap gap-4 text-xs text-white/60">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {tenant.address ?? 'Address not set'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> Joined {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" /> {staff.length} team members
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm text-white/70">
              <div>
                <span className="text-xs uppercase text-white/50">Slug</span>
                <p className="font-medium">{tenant.slug}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-white/50">Email</span>
                <p>{tenant.email ?? 'not provided'}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-white/50">Phone</span>
                <p>{tenant.phone ?? 'not provided'}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Bookings</h2>
              <Button variant="ghost" className="text-xs text-white/70">
                Export
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {bookings.slice(0, 6).map((booking) => (
                <li key={booking.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div>
                    <p className="text-sm font-medium">{booking.id.slice(0, 8)}</p>
                    <p className="text-xs text-white/60">
                      {new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs uppercase text-white/60">{booking.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
              {bookings.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-white/60">
                  No bookings have synced yet.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ticket Pulse</h2>
              <Button variant="ghost" className="text-xs text-white/70">
                View tickets
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {tickets.slice(0, 6).map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div>
                    <p className="text-sm font-medium">{ticket.title}</p>
                    <p className="text-xs text-white/60">Priority {ticket.priority.toLowerCase()}</p>
                  </div>
                  <span className="text-xs uppercase text-white/60">{ticket.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
              {tickets.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-white/60">
                  No tickets recorded for this tenant yet.
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <Link href={`/dashboard/admin/staff?hotel=${tenant.id}`} className="text-xs text-blue-300 hover:text-blue-200">
              View directory
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {staff.map((member) => (
              <li key={member.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-medium">{member.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-white/60">{member.email}</p>
                </div>
                <span className="text-xs uppercase text-white/60">{member.role}</span>
              </li>
            ))}
            {staff.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-white/60">
                No staff have been invited yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
