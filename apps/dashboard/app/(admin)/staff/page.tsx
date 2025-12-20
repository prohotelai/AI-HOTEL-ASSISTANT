import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Fragment } from 'react'
import { Briefcase, Mail, Search, Shield } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, hasPermission, Permission } from '@/lib/rbac'
import { listStaff } from '@/apps/dashboard/src/server/adminData'
import { Button } from '@/components/ui/button'

// TODO(decision): Confirm whether superadmin impersonation should be enabled in production (default OFF).

export default async function StaffDirectoryPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/staff')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const isSuperadmin = role === 'superadmin'
  const canManage = hasPermission(role, Permission.ADMIN_MANAGE) || isSuperadmin

  const query = typeof searchParams?.q === 'string' ? searchParams.q : undefined
  const staffResult = await listStaff({
    hotelId,
    isSuperadmin,
    search: query,
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-blue-300/80">
            <Shield className="h-6 w-6" />
            <p className="text-xs uppercase tracking-[0.4em]">Team Directory</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Operational Staff</h1>
              <p className="text-sm text-white/60">Organise access, monitor activity, and guide service excellence.</p>
            </div>
            {canManage && (
              <Button className="bg-blue-500 hover:bg-blue-400">Invite team member</Button>
            )}
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="search"
              defaultValue={query}
              placeholder="Search by name or email"
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
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/40">
                {staffResult.items.map((member) => (
                  <Fragment key={member.id}>
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <p className="font-medium">{member.name ?? 'Unnamed member'}</p>
                        <p className="text-xs text-white/50">Hotel {member.hotelId?.slice(0, 8) ?? 'n/a'}</p>
                      </td>
                      <td className="px-6 py-4 text-white/70">{member.role}</td>
                      <td className="px-6 py-4">
                        <a href={`mailto:${member.email}`} className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200">
                          <Mail className="h-4 w-4" /> {member.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-white/60">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/admin/staff/${member.id}`}
                          className="text-xs text-blue-300 hover:text-blue-200"
                        >
                          View profile
                        </Link>
                      </td>
                    </tr>
                  </Fragment>
                ))}
                {staffResult.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-white/60">
                      No team members match this filter.
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
