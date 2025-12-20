import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Permission } from '@/lib/rbac'
import { getTicket } from '@/lib/services/ticketService'
import { handleRouteError, parseWithZod, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const paramsSchema = z.object({
  id: z.string().cuid(),
})

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = parseWithZod(paramsSchema, context.params)
    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const ticket = await getTicket(admin.hotelId, id)

    return NextResponse.json(ticket)
  } catch (error) {
    return handleRouteError(error)
  }
}
