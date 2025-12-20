import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasPermission, Permission, permissionsForRole } from '@/lib/rbac'
import { getTicket } from '@/lib/services/ticketService'
import { prisma } from '@/lib/prisma'
import TicketDetail from '@/components/tickets/TicketDetail'

interface PageProps {
  params: { ticketId: string }
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!hasPermission(session.user.role, Permission.TICKETS_VIEW)) {
    redirect('/dashboard')
  }

  const [ticket, tags, team] = await Promise.all([
    getTicket(session.user.hotelId!, params.ticketId).catch((error) => {
      if ((error as any).status === 404) {
        redirect('/dashboard/tickets')
      }
      throw error
    }),
    Promise.resolve([]), // ticketTag model doesn't exist yet
    prisma.user.findMany({
      where: { hotelId: session.user.hotelId! },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <TicketDetail
      sessionUser={{
        id: session.user.id,
        role: session.user.role,
        hotelId: session.user.hotelId!,
        name: session.user.name ?? null,
        email: session.user.email,
      }}
      ticket={ticket}
      tags={tags}
      teamMembers={team}
      permissions={permissionsForRole(session.user.role)}
    />
  )
}
