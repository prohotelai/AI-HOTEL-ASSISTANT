import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Permission } from '@/lib/rbac'
import { getTenantDetail } from '@/apps/dashboard/src/server/adminData'
import { handleRouteError, parseWithZod, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const paramsSchema = z.object({
  id: z.string().cuid(),
})

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const { id } = parseWithZod(paramsSchema, context.params)
    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const tenant = await getTenantDetail(id, admin.isSuperadmin, admin.hotelId)

    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      createdAt: tenant.createdAt?.toISOString() ?? null,
      users: [], // users relation not in schema
      bookings: [], // bookings relation not in schema
      tickets: [], // tickets relation not in schema
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
