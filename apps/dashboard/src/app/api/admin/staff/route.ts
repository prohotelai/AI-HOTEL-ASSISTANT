import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Permission } from '@/lib/rbac'
import { listStaff } from '@/apps/dashboard/src/server/adminData'
import { handleRouteError, parseWithZod, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const querySchema = z.object({
  q: z
    .string()
    .max(120)
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const queryParams = parseWithZod(querySchema, Object.fromEntries(url.searchParams.entries()))
    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const staff = await listStaff({
      hotelId: admin.hotelId,
      isSuperadmin: admin.isSuperadmin,
      search: queryParams.q,
    })

    return NextResponse.json({
      items: staff.items.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        hotelId: member.hotelId,
        createdAt: member.createdAt?.toISOString() ?? null,
      })),
      total: staff.total,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
