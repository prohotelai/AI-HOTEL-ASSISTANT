import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Permission } from '@/lib/rbac'
import { listTenants } from '@/apps/dashboard/src/server/adminData'
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

    const context = await requireAdminContext(Permission.ADMIN_VIEW)

    const tenants = await listTenants({
      hotelId: context.hotelId,
      isSuperadmin: context.isSuperadmin,
      search: queryParams.q,
    })

    return NextResponse.json({
      items: tenants.items.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description,
        email: tenant.email,
        phone: tenant.phone,
        createdAt: tenant.createdAt?.toISOString() ?? null,
      })),
      total: tenants.total,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
