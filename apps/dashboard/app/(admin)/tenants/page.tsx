import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Fragment } from 'react'
import { Building2, Search, Users } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, hasPermission, Permission } from '@/lib/rbac'
import { countBookingsForHotel, countTicketsForHotel, listTenants } from '@/apps/dashboard/src/server/adminData'
import { Button } from '@/components/ui/button'

export default async function TenantsPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/tenants')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const isSuperadmin = role === 'superadmin'
  const canManage = hasPermission(role, Permission.ADMIN_MANAGE) || isSuperadmin

  const query = typeof searchParams?.q === 'string' ? searchParams.q : undefined

  const tenantsResult = await listTenants({
    hotelId,
    isSuperadmin,
    search: query,
  })

  const enriched = await Promise.all(
    tenantsResult.items.map(async (tenant) => {
      const [bookingCount, ticketCount] = await Promise.all([
        countBookingsForHotel(tenant.id),
        countTicketsForHotel(tenant.id),
      ])

      return {
        ...tenant,
        bookingCount,
        ticketCount,
      }
    })
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-blue-300/80">
            <Building2 className="h-6 w-6" />
            <p className="text-xs uppercase tracking-[0.4em]">Tenant Directory</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Hotels & Affiliates</h1>
              <p className="text-sm text-white/60">Review tenant health, configured channels, and operational signals.</p>
            </div>
            {canManage && (
              <Button className="bg-blue-500 hover:bg-blue-400">Invite new tenant</Button>
            )}
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="search"
              defaultValue={query}
              placeholder="Search by hotel or slug"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              name="q"
            />
            <Button type="submit" variant="ghost" className="text-xs text-white/70">
              Filter
            </Button>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/10 text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-6 py-3">Hotel</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Bookings</th>
                  <th className="px-6 py-3">Tickets</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/40">
                {enriched.map((tenant) => (
                  <Fragment key={tenant.id}>
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-200">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-white/50">{tenant.description ?? 'No summary available'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/70">{tenant.slug}</td>
                      <td className="px-6 py-4">{tenant.bookingCount}</td>
                      <td className="px-6 py-4">{tenant.ticketCount}</td>
                      <td className="px-6 py-4 text-white/60">
                        {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/admin/tenants/${tenant.id}`}
                          className="text-xs text-blue-300 hover:text-blue-200"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  </Fragment>
                ))}
                {enriched.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-white/60">
                      No tenants matched this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
