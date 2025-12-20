import { NextRequest, NextResponse } from 'next/server'
import { Permission } from '@/lib/rbac'
import { listTickets } from '@/lib/services/ticketService'
import { ticketListQuerySchema } from '@/lib/validation/tickets'
import { handleRouteError, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = ticketListQuerySchema.parse(Object.fromEntries(url.searchParams.entries()))

    const params = new URLSearchParams()
    if (parsed.status) params.set('status', parsed.status)
    if (parsed.priority) params.set('priority', parsed.priority)
    if (parsed.search) params.set('search', parsed.search)
    if (parsed.assignedTo) params.set('assignedTo', parsed.assignedTo)
    if (parsed.cursor) params.set('cursor', parsed.cursor)
    params.set('limit', String(parsed.limit))

    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const tickets = await listTickets(admin.hotelId, params)

    return NextResponse.json({
      items: tickets.items,
      nextCursor: tickets.nextCursor ?? null,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
