import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Permission } from '@/lib/rbac'
import { handleRouteError, parseWithZod, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const updateSchema = z.object({
  widgetTitle: z.string().max(80).optional(),
  widgetColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  brandingPrimary: z.string().max(30).optional(),
  brandingAccent: z.string().max(30).optional(),
  locale: z.enum(['en', 'ar']).optional(),
})

export async function GET() {
  try {
    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const hotel = await prisma.hotel.findUnique({
      where: { id: admin.hotelId },
      select: {
        id: true,
        name: true,
        widgetTitle: true,
        widgetColor: true,
        logo: true,
        website: true,
      },
    })

    if (!hotel) {
      return NextResponse.json({ message: 'Hotel not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...hotel,
      preferences: {
        locale: 'en',
        brandingPrimary: hotel.widgetColor ?? '#3B82F6',
        brandingAccent: '#10B981',
      },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminContext(Permission.ADMIN_MANAGE)
    const body = await request.json()
    const payload = parseWithZod(updateSchema, body)

    await prisma.hotel.update({
      where: { id: admin.hotelId },
      data: {
        widgetTitle: payload.widgetTitle ?? undefined,
        widgetColor: payload.widgetColor ?? undefined,
      },
    })

    // TODO(decision): Persist brandingPrimary/brandingAccent once theming schema is defined.

    return NextResponse.json({ status: 'updated' })
  } catch (error) {
    return handleRouteError(error)
  }
}
