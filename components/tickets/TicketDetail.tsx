'use client'

import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'
import { TicketPriorityBadge, TicketPriority } from '@/components/tickets/TicketPriorityBadge'
import { Permission } from '@/lib/rbac'
import { ArrowLeft, Loader2, MessageCircle, Save, ShieldAlert, UserCircle } from 'lucide-react'

type SessionUser = {
  id: string
  role: string
  hotelId: string
  email: string
  name: string | null
}

type TagOption = {
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

type TicketComment = {
  id: string
  content: string
  isInternal: boolean
  createdAt: string | Date
  user: {
    id: string
    name: string | null
    email: string
  }
}

type TicketAudit = {
  id: string
  action: string
  payload: unknown
  createdAt: string | Date
  actor: {
    id: string
    name: string | null
    email: string
  } | null
}

type TicketDetailData = {
  id: string
  title: string
  description: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
  priority: TicketPriority
  source: string
  guestName: string | null
  guestEmail: string | null
  guestRoom: string | null
  createdAt: string | Date
  updatedAt: string | Date
  dueAt: string | Date | null
  slaMinutes: number | null
  escalationLevel: number
  conversationId: string | null
  assignedTo: { id: string; name: string | null; email: string } | null
  createdBy: { id: string; name: string | null; email: string } | null
  tags: { tag: TagOption }[]
  comments: TicketComment[]
  audits: TicketAudit[]
}

type TicketDetailProps = {
  sessionUser: SessionUser
  ticket: TicketDetailData
  tags: TagOption[]
  teamMembers: TeamMember[]
  permissions: Permission[]
}

type UpdateFormState = {
  title: string
  description: string
  status: TicketDetailData['status']
  priority: TicketPriority
  assignedToId: string
  tags: string[]
  slaMinutes: string
  dueAt: string
}

type CommentFormState = {
  body: string
  visibility: 'PUBLIC' | 'INTERNAL'
}

function toInputDate(value: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  const pad = (input: number) => input.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function renderAuditLabel(audit: TicketAudit) {
  switch (audit.action) {
    case 'CREATED':
      return 'Ticket created'
    case 'UPDATED':
      return 'Ticket updated'
    case 'CLOSED':
      return 'Ticket closed'
    case 'COMMENT_ADDED':
      return 'Public comment added'
    case 'INTERNAL_NOTE_ADDED':
      return 'Internal note added'
    default:
      return audit.action.replaceAll('_', ' ').toLowerCase()
  }
}

export default function TicketDetail({ sessionUser, ticket, tags, teamMembers, permissions }: TicketDetailProps) {
  const [details, setDetails] = useState(ticket)
  const [updateForm, setUpdateForm] = useState<UpdateFormState>({
    title: ticket.title,
    description: ticket.description ?? '',
    status: ticket.status,
    priority: ticket.priority,
    assignedToId: ticket.assignedTo?.id ?? '',
    tags: ticket.tags.map(({ tag }) => tag.id),
    slaMinutes: ticket.slaMinutes ? String(ticket.slaMinutes) : '',
    dueAt: toInputDate(ticket.dueAt),
  })
  const [commentForm, setCommentForm] = useState<CommentFormState>({ body: '', visibility: 'PUBLIC' })
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const canUpdate = permissions.includes(Permission.TICKETS_UPDATE)
  const canAssign = permissions.includes(Permission.TICKETS_ASSIGN)
  const canComment = permissions.includes(Permission.TICKETS_COMMENT)

  const assignedOption = useMemo(() => {
    if (!details.assignedTo) return 'Unassigned'
    return details.assignedTo.name || details.assignedTo.email
  }, [details.assignedTo])

  async function handleUpdateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canUpdate) return

    setIsSaving(true)
    setUpdateError(null)

    try {
      const payload: Record<string, unknown> = {
        title: updateForm.title.trim() || undefined,
        description: updateForm.description.trim() || undefined,
        status: updateForm.status,
        priority: updateForm.priority,
        assignedToId: updateForm.assignedToId || null,
        tags: updateForm.tags,
        slaMinutes: updateForm.slaMinutes ? Number(updateForm.slaMinutes) : null,
        dueAt: updateForm.dueAt ? new Date(updateForm.dueAt).toISOString() : null,
      }

      const response = await fetch(`/api/tickets/${details.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Update failed')
      }

      const data: TicketDetailData = await response.json()
      setDetails(data)
      setUpdateForm({
        title: data.title,
        description: data.description ?? '',
        status: data.status,
        priority: data.priority,
        assignedToId: data.assignedTo?.id ?? '',
        tags: data.tags.map(({ tag }) => tag.id),
        slaMinutes: data.slaMinutes ? String(data.slaMinutes) : '',
        dueAt: toInputDate(data.dueAt),
      })
      // Page will revalidate automatically after successful update
    } catch (error) {
      setUpdateError((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canComment) return
    if (!commentForm.body.trim()) {
      setCommentError('Comment cannot be empty')
      return
    }

    setIsCommenting(true)
    setCommentError(null)

    try {
      const response = await fetch(`/api/tickets/${details.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentForm.body.trim(),
          visibility: commentForm.visibility,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to add comment')
      }

      const comment: TicketComment = await response.json()
      setDetails((prev) => ({
        ...prev,
        comments: [...prev.comments, comment],
        audits: prev.audits,
      }))
      setCommentForm({ body: '', visibility: commentForm.visibility })
      // Page will revalidate automatically after successful update
    } catch (error) {
      setCommentError((error as Error).message)
    } finally {
      setIsCommenting(false)
    }
  }

  async function handleCloseTicket() {
    if (details.status === 'CLOSED' || !canUpdate) return

    setIsClosing(true)
    setUpdateError(null)

    try {
      const response = await fetch(`/api/tickets/${details.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to close ticket')
      }

      const data: TicketDetailData = await response.json()
      setDetails(data)
      setUpdateForm((prev) => ({ ...prev, status: 'CLOSED' }))
      // Page will revalidate automatically after successful update
    } catch (error) {
      setUpdateError((error as Error).message)
    } finally {
      setIsClosing(false)
    }
  }

  function toggleTag(tagId: string) {
    setUpdateForm((prev) => {
      const exists = prev.tags.includes(tagId)
      return {
        ...prev,
        tags: exists ? prev.tags.filter((id) => id !== tagId) : [...prev.tags, tagId],
      }
    })
  }

  const visibleTags = details.tags.map(({ tag }) => tag)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/dashboard/tickets" className="inline-flex">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tickets
          </Button>
        </a>
        <span className="text-xs uppercase tracking-wide text-gray-400">Ticket #{details.id}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{details.title}</h1>
              <p className="mt-2 text-sm text-gray-600">Opened {format(new Date(details.createdAt), 'dd MMM yyyy HH:mm')} • Last updated {formatDistanceToNow(new Date(details.updatedAt), { addSuffix: true })}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <TicketStatusBadge status={details.status} />
                <TicketPriorityBadge priority={details.priority} />
                {visibleTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border px-2 py-0.5 text-xs font-medium"
                    style={{
                      borderColor: tag.color ?? '#cbd5f5',
                      backgroundColor: `${(tag.color ?? '#3b82f6')}14`,
                      color: tag.color ?? '#1f2937',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-800">{assignedOption}</span>
              </div>
              {details.guestName && (
                <div>
                  Guest: <span className="font-medium text-gray-800">{details.guestName}</span>
                  {details.guestRoom && <span className="ml-2 text-gray-500">Room {details.guestRoom}</span>}
                </div>
              )}
              {details.guestEmail && <div>Email: {details.guestEmail}</div>}
              {details.dueAt && <div>Due {format(new Date(details.dueAt), 'dd MMM yyyy HH:mm')}</div>}
              {details.slaMinutes && <div>SLA: {details.slaMinutes} minutes</div>}
            </div>
          </header>

          <article className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="whitespace-pre-line text-sm text-gray-700">{details.description || 'No description provided.'}</p>
          </article>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MessageCircle className="h-4 w-4" />
              Conversation
            </div>
            <div className="space-y-4">
              {details.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                    <span>
                      {(comment.user.name || comment.user.email) ?? 'Unknown'} • {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm')}
                    </span>
                    <span className={clsx('rounded-full px-2 py-0.5 font-medium', !comment.isInternal ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200')}>
                      {!comment.isInternal ? 'Public' : 'Internal'}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
              {details.comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
            <div className="space-y-3 text-sm text-gray-600">
              {details.audits.map((audit) => (
                <div key={audit.id} className="rounded-md border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                    <span>{renderAuditLabel(audit)}</span>
                    <span>{format(new Date(audit.createdAt), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                  {audit.actor && (
                    <div className="mt-2 text-sm text-gray-700">
                      By {audit.actor.name || audit.actor.email}
                    </div>
                  )}
                </div>
              ))}
              {details.audits.length === 0 && <p className="text-sm text-gray-500">No audits recorded.</p>}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Update ticket</h2>
            <p className="mt-1 text-sm text-gray-600">Adjust metadata, ownership, and priorities to keep work on track.</p>

            {!canUpdate && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <ShieldAlert className="h-4 w-4" />
                You do not have permission to update this ticket.
              </div>
            )}

            {updateError && (
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{updateError}</p>
            )}

            <form className="mt-4 space-y-4" onSubmit={handleUpdateSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Title</label>
                <Input
                  value={updateForm.title}
                  onChange={(event) => setUpdateForm((prev) => ({ ...prev, title: event.target.value }))}
                  disabled={!canUpdate || isSaving}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={updateForm.description}
                  onChange={(event) => setUpdateForm((prev) => ({ ...prev, description: event.target.value }))}
                  disabled={!canUpdate || isSaving}
                  className="min-h-[120px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={updateForm.status}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, status: event.target.value as UpdateFormState['status'] }))}
                    disabled={!canUpdate || isSaving}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED', 'CLOSED', 'CANCELLED'].map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={updateForm.priority}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, priority: event.target.value as TicketPriority }))}
                    disabled={!canUpdate || isSaving}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] satisfies TicketPriority[]).map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Assignee</label>
                <select
                  value={updateForm.assignedToId}
                  onChange={(event) => setUpdateForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
                  disabled={!(canUpdate && canAssign) || isSaving}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">SLA minutes</label>
                  <Input
                    type="number"
                    min={0}
                    value={updateForm.slaMinutes}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, slaMinutes: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Due at</label>
                  <Input
                    type="datetime-local"
                    value={updateForm.dueAt}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, dueAt: event.target.value }))}
                    disabled={!canUpdate || isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = updateForm.tags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        disabled={!canUpdate || isSaving}
                        className={clsx(
                          'rounded-full border px-3 py-1 text-xs font-medium transition',
                          active ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-500'
                        )}
                        style={active && tag.color ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!canUpdate || isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canUpdate || isClosing || details.status === 'CLOSED'}
                  onClick={handleCloseTicket}
                >
                  {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Close ticket
                </Button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add comment</h2>
            <p className="mt-1 text-sm text-gray-600">Share an update with teammates or leave an internal note.</p>

            {!canComment && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <ShieldAlert className="h-4 w-4" />
                You do not have permission to comment on this ticket.
              </div>
            )}

            {commentError && (
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{commentError}</p>
            )}

            <form className="mt-4 space-y-4" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentForm.body}
                onChange={(event) => setCommentForm((prev) => ({ ...prev, body: event.target.value }))}
                disabled={!canComment || isCommenting}
                className="min-h-[140px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your comment..."
              />

              <div className="flex gap-4 text-sm text-gray-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={commentForm.visibility === 'PUBLIC'}
                    onChange={(event) => setCommentForm((prev) => ({ ...prev, visibility: event.target.value as CommentFormState['visibility'] }))}
                    disabled={!canComment || isCommenting}
                  />
                  Public
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="INTERNAL"
                    checked={commentForm.visibility === 'INTERNAL'}
                    onChange={(event) => setCommentForm((prev) => ({ ...prev, visibility: event.target.value as CommentFormState['visibility'] }))}
                    disabled={!canComment || isCommenting}
                  />
                  Internal note
                </label>
              </div>

              <Button type="submit" disabled={!canComment || isCommenting}>
                {isCommenting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                Post comment
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}
