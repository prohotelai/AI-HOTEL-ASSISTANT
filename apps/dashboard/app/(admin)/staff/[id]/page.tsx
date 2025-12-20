import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Calendar, MessageCircle, Shield, Ticket } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'
import { getStaffDetail } from '@/apps/dashboard/src/server/adminData'
import { Button } from '@/components/ui/button'

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/staff')
  }

  const { hotelId } = assertPermission(session, Permission.ADMIN_VIEW)
  const role = session.user.role?.toLowerCase() ?? 'staff'
  const isSuperadmin = role === 'superadmin'

  const staffMember = await getStaffDetail(params.id, isSuperadmin, hotelId)

  if (!staffMember) {
    notFound()
  }

  const tickets: any[] = [] // assignedTickets relation doesn't exist yet
  const conversations = staffMember.conversations ?? []

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <Link href="/dashboard/admin/staff" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
            <ArrowLeft className="h-4 w-4" /> Back to directory
          </Link>

          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-300/80">Team Member</p>
                <h1 className="text-3xl font-semibold">{staffMember.name ?? 'Unnamed team member'}</h1>
                <p className="text-sm text-white/60">{staffMember.email}</p>
              </div>
              <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-wide text-white/70">
                {staffMember.role}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-white/60">
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4" /> Hotel {staffMember.hotelId?.slice(0, 8) ?? 'n/a'}
              </span>
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Joined {formatDistanceToNow(new Date(staffMember.createdAt), { addSuffix: true })}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Recent conversations {conversations.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-white/60">
              <Button variant="outline" className="border-white/20 bg-black/40 text-white">
                Trigger password reset
              </Button>
              <Button variant="ghost" className="text-white/70">
                View audit log
              </Button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ticket Ownership</h2>
            <Button variant="ghost" className="text-xs text-white/70">
              Assign ticket
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {tickets.slice(0, 8).map((ticket) => (
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
                No tickets assigned.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">Recent Conversations</h2>
          <ul className="mt-4 space-y-3">
            {conversations.slice(0, 6).map((conversation) => (
              <li key={conversation.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-medium">Conversation {conversation.id.slice(0, 6)}</p>
                  <p className="text-xs text-white/60">Started {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}</p>
                </div>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-white/60">
                No conversations recorded yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
