import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, Download, Filter, Search, Shield } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export default async function AuditLogPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/audit-log')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_MANAGE)

  const action = typeof searchParams?.action === 'string' ? searchParams.action : undefined
  const actorId = typeof searchParams?.actor === 'string' ? searchParams.actor : undefined

  // TODO: Create AuditLog model in Prisma schema and load entries
  const auditEntries: AuditEntry[] = []

  const actionTypes = ['USER_CREATED', 'USER_UPDATED', 'TICKET_CREATED', 'TICKET_UPDATED', 'KB_DOCUMENT_ARCHIVED', 'BOOKING_SYNCED']

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-blue-300/80">
          <Shield className="h-6 w-6" />
          <p className="text-xs uppercase tracking-[0.4em]">Security & Compliance</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Audit Log</h1>
            <p className="text-sm text-white/60">Review all system actions, changes, and access patterns.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-400">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <form className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="search"
              placeholder="Search by user, action, or resource"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              name="q"
            />
          </div>
          <select
            name="action"
            defaultValue={action ?? ''}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All actions</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <Button type="submit" className="bg-blue-500 hover:bg-blue-400">
            Apply
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {auditEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-white/30" />
            <p className="mt-4 text-sm text-white/60">No audit entries available yet.</p>
            <p className="mt-2 text-xs text-white/50">
              TODO: Create AuditLog Prisma model with fields: hotelId, actorId, action, resourceType, resourceId, metadata, ipAddress, userAgent, occurredAt.
            </p>
            <p className="mt-3 text-xs text-white/50">
              Wire event listeners to persist audit trails from KB, tickets, bookings, and user management workflows.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/10 text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Resource</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/40">
                {auditEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white/70">
                      {formatDistanceToNow(entry.occurredAt, { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{entry.actorName}</span>
                        <span className="text-xs text-white/50">{entry.actorEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-400/15 px-3 py-1 text-xs uppercase tracking-wide text-blue-200">
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/70">{entry.resourceType}</td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/admin/audit-log/${entry.id}`} className="text-xs text-blue-300 hover:text-blue-200">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-6">
        <div className="flex items-start gap-3 text-yellow-100">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Compliance Notice</p>
            <p className="mt-1 text-xs text-yellow-100/80">
              Audit logs are retained for 90 days by default. Configure retention policy in hotel settings.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

type AuditEntry = {
  id: string
  actorId: string
  actorName: string
  actorEmail: string
  action: string
  resourceType: string
  resourceId: string
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  occurredAt: Date
}
