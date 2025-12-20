import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { permissionsForRole, Permission, hasPermission } from '@/lib/rbac'
import { listTickets } from '@/lib/services/ticketService'
import { prisma } from '@/lib/prisma'
import TicketsDashboard from '@/components/tickets/TicketsDashboard'

export default async function TicketsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const canViewTickets = hasPermission(session.user.role, Permission.TICKETS_VIEW)
  if (!canViewTickets) {
    redirect('/dashboard')
  }

  const permissions = permissionsForRole(session.user.role)
  const [tickets, tags, team] = await Promise.all([
    listTickets(session.user.hotelId!, new URLSearchParams()),
    Promise.resolve([]), // ticketTag model doesn't exist yet
    prisma.user.findMany({
      where: { hotelId: session.user.hotelId! },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })
  ])

  return (
    <TicketsDashboard
      sessionUser={{
        id: session.user.id,
        role: session.user.role,
        hotelId: session.user.hotelId!,
        email: session.user.email,
        name: session.user.name ?? null,
      }}
      initialTickets={tickets}
      tags={tags}
      teamMembers={team}
      permissions={permissions}
    />
  )
}
