import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Permission } from '@/lib/rbac'
import { getStaffDetail } from '@/apps/dashboard/src/server/adminData'
import { handleRouteError, parseWithZod, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const paramsSchema = z.object({
  id: z.string().cuid(),
})

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = parseWithZod(paramsSchema, context.params)
    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const staffMember = await getStaffDetail(id, admin.isSuperadmin, admin.hotelId)

    if (!staffMember) {
      return NextResponse.json({ message: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: staffMember.id,
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      hotelId: staffMember.hotelId,
      createdAt: staffMember.createdAt?.toISOString() ?? null,
      tickets: [], // assignedTickets relation not in schema
      conversations: staffMember.conversations?.map((conversation) => ({
        id: conversation.id,
        createdAt: conversation.createdAt.toISOString(),
      })) ?? [],
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
