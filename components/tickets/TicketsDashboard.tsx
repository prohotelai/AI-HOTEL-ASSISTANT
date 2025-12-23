'use client'

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { TicketPriorityBadge, TicketPriority } from '@/components/tickets/TicketPriorityBadge'
import { Permission } from '@/lib/rbac'
import { format } from 'date-fns'
import clsx from 'clsx'
import { Loader2, MessageCircle, Filter, Plus, RefreshCw } from 'lucide-react'

const statusFilters = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const
const priorityFilters: Array<'ALL' | TicketPriority> = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']

type TicketTag = {
  id: string
  name: string
  color: string | null
}

type TeamMember = {
  id: string
  name: string | null
  email: string
  role: string
}

type TicketListItem = {
  id: string
  title: string
  description?: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
  priority: TicketPriority
  source: string
  guestName?: string | null
  guestEmail?: string | null
  guestRoom?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  dueAt?: string | Date | null
  slaMinutes?: number | null
  escalationLevel: number
  assignedTo: { id: string; name: string | null; email: string } | null
  createdBy: { id: string; name: string | null; email: string } | null
  tags: { tag: TicketTag }[]
  _count: { comments: number }
}

type TicketListResponse = {
  items: TicketListItem[]
  nextCursor?: string
}

type SessionUser = {
  id: string
  role: string
  hotelId: string
  email: string
  name: string | null
}

type TicketsDashboardProps = {
  sessionUser: SessionUser
  initialTickets: TicketListResponse
  tags: TicketTag[]
  teamMembers: TeamMember[]
  permissions: Permission[]
}

type CreateTicketForm = {
  title: string
  description: string
  priority: TicketPriority
  assignedToId: string
  guestName: string
  guestEmail: string
  guestRoom: string
  tags: string[]
  slaMinutes: string
}

const defaultFormValues: CreateTicketForm = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  assignedToId: '',
  guestName: '',
  guestEmail: '',
  guestRoom: '',
  tags: [],
  slaMinutes: '',
}

function toLocalDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  return format(value instanceof Date ? value : new Date(value), 'dd MMM yyyy HH:mm')
}

export default function TicketsDashboard({
  sessionUser,
  initialTickets,
  tags,
  teamMembers,
  permissions,
}: TicketsDashboardProps) {
  const [tickets, setTickets] = useState(initialTickets.items)
  const [nextCursor, setNextCursor] = useState(initialTickets.nextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<CreateTicketForm>(defaultFormValues)
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>('OPEN')
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityFilters)[number]>('ALL')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const canCreate = permissions.includes(Permission.TICKETS_CREATE)
  const canUpdate = permissions.includes(Permission.TICKETS_UPDATE)
  const canAssign = permissions.includes(Permission.TICKETS_ASSIGN)
  const canComment = permissions.includes(Permission.TICKETS_COMMENT)

  useEffect(() => {
    setTickets(initialTickets.items)
    setNextCursor(initialTickets.nextCursor)
  }, [initialTickets.items, initialTickets.nextCursor])

  const stats = useMemo(() => {
    const summary: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_RESPONSE: 0,
      RESOLVED: 0,
      CLOSED: 0,
      CANCELLED: 0,
      total: tickets.length,
    }

    tickets.forEach((ticket) => {
      if (summary[ticket.status] !== undefined) {
        summary[ticket.status] += 1
      }
    })

    return summary
  }, [tickets])

  async function handleRefresh() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'ALL') params.set('priority', priorityFilter)
      if (search) params.set('search', search)
      const response = await fetch(`/api/tickets?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error('Failed to load tickets')
      }
      const data: TicketListResponse = await response.json()
      setTickets(data.items)
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        title: formValues.title.trim(),
        description: formValues.description.trim() || undefined,
        priority: formValues.priority,
        assignedToId: formValues.assignedToId || null,
        guestName: formValues.guestName.trim() || undefined,
        guestEmail: formValues.guestEmail.trim() || undefined,
        guestRoom: formValues.guestRoom.trim() || undefined,
        tags: formValues.tags,
        slaMinutes: formValues.slaMinutes ? Number(formValues.slaMinutes) : undefined,
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to create ticket')
      }

      const ticket: TicketListItem = await response.json()
      setTickets((prev) => [ticket, ...prev])
      setShowCreateForm(false)
      setFormValues(defaultFormValues)
      // Page will revalidate automatically after successful update
    } catch (error) {
      setFormError((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleTag(tagId: string) {
    setFormValues((prev) => {
      const exists = prev.tags.includes(tagId)
      return {
        ...prev,
        tags: exists ? prev.tags.filter((id) => id !== tagId) : [...prev.tags, tagId],
      }
    })
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-600">Manage guest requests, automate escalations, and collaborate with your team.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" />
            {showCreateForm ? 'Cancel' : 'Create Ticket'}
          </Button>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED'] as const).map((status) => (
          <article key={status} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{status.replace('_', ' ')}</span>
              <TicketStatusBadge status={status} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats[status]}</p>
            <p className="text-xs text-gray-500">Active tickets</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition',
                    statusFilter === status
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-500'
                  )}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Priority</label>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as (typeof priorityFilters)[number])}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {priorityFilters.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search...
"
                className="w-48"
              />
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                <span className="ml-2">Apply</span>
              </Button>
              <Button variant="ghost" onClick={() => { setStatusFilter('OPEN'); setPriorityFilter('ALL'); setSearch(''); startTransition(() => handleRefresh()); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3 w-32">Priority</th>
                <th className="px-4 py-3 w-32">Status</th>
                <th className="px-4 py-3 w-40">Assigned</th>
                <th className="px-4 py-3 w-48">Tags</th>
                <th className="px-4 py-3 w-40">SLA / Due</th>
                <th className="px-4 py-3 w-32 text-center"><MessageCircle className="mx-auto h-4 w-4" /></th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b last:border-b-0 hover:bg-gray-50/90">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-900">{ticket.title}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{ticket.description || '—'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>Opened {format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm')}</span>
                      {ticket.guestRoom && <span>• Room {ticket.guestRoom}</span>}
                      {ticket.guestName && <span>• {ticket.guestName}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <TicketPriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-gray-600">
                    {ticket.assignedTo ? (
                      <div>
                        <div className="font-medium text-gray-800">{ticket.assignedTo.name || ticket.assignedTo.email}</div>
                        <div>{ticket.assignedTo.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {ticket.tags.length ? (
                        ticket.tags.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="rounded-full border px-2 py-0.5 text-xs font-medium"
                            style={{ borderColor: tag.color ?? '#cbd5f5', backgroundColor: `${(tag.color ?? '#3b82f6')}14`, color: tag.color ?? '#1f2937' }}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-gray-600">
                    {ticket.slaMinutes ? `${ticket.slaMinutes} mins` : '—'}
                    <div className="mt-1">{toLocalDate(ticket.dueAt ?? null)}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-center text-xs text-gray-500">
                    {ticket._count.comments}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <a href={`/dashboard/tickets/${ticket.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-gray-500">
              No tickets match your filters yet.
            </div>
          )}
        </div>
      </section>

      {showCreateForm && canCreate && (
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create ticket</h2>
          <p className="mt-1 text-sm text-gray-600">Capture guest issues or internal tasks. Automations kick in immediately after creation.</p>

          {formError && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}

          <form className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleCreateTicket}>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <Input
                required
                maxLength={180}
                value={formValues.title}
                onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Guests in room 1205 need extra towels"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                rows={4}
                maxLength={5000}
                value={formValues.description}
                onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={formValues.priority}
                onChange={(event) => setFormValues((prev) => ({ ...prev, priority: event.target.value as TicketPriority }))}
              >
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign to</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={formValues.assignedToId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, assignedToId: event.target.value }))}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email} ({member.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Guest name</label>
              <Input
                value={formValues.guestName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, guestName: event.target.value }))}
                placeholder="Alex Johnson"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Guest email</label>
              <Input
                type="email"
                value={formValues.guestEmail}
                onChange={(event) => setFormValues((prev) => ({ ...prev, guestEmail: event.target.value }))}
                placeholder="guest@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Room number</label>
              <Input
                value={formValues.guestRoom}
                onChange={(event) => setFormValues((prev) => ({ ...prev, guestRoom: event.target.value }))}
                placeholder="1205"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SLA minutes</label>
              <Input
                type="number"
                min={5}
                max={2880}
                value={formValues.slaMinutes}
                onChange={(event) => setFormValues((prev) => ({ ...prev, slaMinutes: event.target.value }))}
                placeholder="60"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = formValues.tags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        active ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-500'
                      )}
                    >
                      {tag.name}
                    </button>
                  )
                })}
                {!tags.length && <span className="text-xs text-gray-400">No tags yet. Create them via API or seed data.</span>}
              </div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create ticket
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
