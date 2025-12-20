import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, MessageSquare, Paperclip, Tag } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { getTicket } from '@/lib/services/ticketService'
import { StatusBadge } from '@/apps/dashboard/app/(admin)/components/StatusBadge'
import { Button } from '@/components/ui/button'

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/tickets')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)

  const ticket = await getTicket(hotelId, params.id)

  if (!ticket) {
    notFound()
  }

  const statusTone = ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'OPEN' ? 'warning' : 'default'

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/admin/tickets" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              <StatusBadge label={ticket.status.replace(/_/g, ' ')} tone={statusTone as any} />
              <h1 className="text-3xl font-semibold text-white">{ticket.title}</h1>
              <p className="text-sm text-white/60">Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-white/70">
              <div>
                <span className="text-xs uppercase text-white/50">Priority</span>
                <p className="font-medium">{ticket.priority}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-white/50">Assigned</span>
                <p>{ticket.assignedTo?.name ?? 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-xs uppercase text-white/50">Guest</span>
                <p>{ticket.guestName ?? 'Guest'}</p>
              </div>
              <Button variant="outline" className="border-white/20 bg-black/40 text-white">
                Update status
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Conversation</h2>
          <div className="space-y-3 text-sm text-white/70">
            {ticket.comments.map((comment: any) => (
              <div key={comment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="flex items-center justify-between text-xs text-white/50">
                  <span>{comment.author?.name ?? 'System'}</span>
                  <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                </p>
                <p className="mt-2 text-sm text-white/80">{comment.body}</p>
              </div>
            ))}
            {ticket.comments.length === 0 && <p className="text-xs text-white/60">No comments recorded.</p>}
            <Button className="bg-blue-500 hover:bg-blue-400">
              <MessageSquare className="mr-2 h-4 w-4" /> Add update
            </Button>
          </div>
        </article>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Context</h2>
          <div className="space-y-3 text-sm text-white/70">
            <p className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-300" /> Tags: {ticket.tags.map((tag: any) => tag.tag?.name).join(', ') || 'None'}
            </p>
            <p className="inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-blue-300" /> Attachments: TODO integrate file uploads.
            </p>
            <div>
              <p className="text-xs uppercase text-white/50">Automation</p>
              <p className="text-sm text-white/60">TODO: surface SLA automation run history.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
