import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Fragment } from 'react'
import { Filter, Mail, MessageCircle, Plus } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, hasPermission, Permission } from '@/lib/rbac'
import { listTickets } from '@/lib/services/ticketService'
import { DataTable } from '@/apps/dashboard/app/(admin)/components/DataTable'
import { StatusBadge } from '@/apps/dashboard/app/(admin)/components/StatusBadge'
import { Button } from '@/components/ui/button'

export default async function TicketsPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/tickets')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const canManageTickets = hasPermission(role, Permission.TICKETS_UPDATE)

  const params = new URLSearchParams()
  if (typeof searchParams?.status === 'string') params.set('status', searchParams.status)
  const tickets = await listTickets(hotelId, params)

  const columns = [
    {
      key: 'title',
      header: 'Ticket',
      sortable: true,
      render: (value: unknown, ticket: (typeof tickets.items)[number]) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{String(value)}</span>
          <span className="text-xs text-white/50">Source {ticket.source.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value: unknown) => {
        const label = String(value ?? '').replace(/_/g, ' ')
        const tone = label.includes('RESOLVED') ? 'success' : label.includes('OPEN') ? 'warning' : 'default'
        return <StatusBadge label={label} tone={tone as any} />
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (value: unknown) => <span className="text-sm font-medium text-white/70">{String(value)}</span>,
    },
    {
      key: '_count',
      header: 'Comments',
      render: (_value: unknown, ticket: (typeof tickets.items)[number]) => (
        <span className="text-sm text-white/60">{ticket._count?.comments ?? 0}</span>
      ),
    },
    {
      key: 'id',
      header: 'Action',
      align: 'right' as const,
      render: (value: unknown) => (
        <Link href={`/dashboard/admin/tickets/${value}`} className="text-xs text-blue-300 hover:text-blue-200">
          View
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-blue-300/80">Tickets</p>
            <h1 className="text-3xl font-semibold text-white">Service Desk</h1>
            <p className="text-sm text-white/60">Coordinate guest resolutions and SLA tracking.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
            {canManageTickets && (
              <Button className="bg-blue-500 hover:bg-blue-400">
                <Plus className="mr-2 h-4 w-4" /> New ticket
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-white/60">Activity</p>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            {tickets.items.slice(0, 3).map((ticket: any) => (
              <Fragment key={ticket.id}>
                <p className="flex items-center gap-2 text-white/80">
                  <MessageCircle className="h-4 w-4 text-blue-300" /> {ticket.title}
                </p>
                <p className="text-xs text-white/50">Updated {new Date(ticket.createdAt).toLocaleString()}</p>
              </Fragment>
            ))}
            {tickets.items.length === 0 && <p className="text-xs text-white/60">No tickets to show</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-white/60">Escalations</p>
          <p className="mt-3 text-sm text-white/50">TODO: Connect escalation automation metrics.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-white/60">Comms</p>
          <p className="mt-3 text-sm text-white/50 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-300" /> TODO: Add outbound message log.
          </p>
        </div>
      </section>

      <section>
        <DataTable columns={columns} data={tickets.items as any} />
      </section>
    </div>
  )
}
