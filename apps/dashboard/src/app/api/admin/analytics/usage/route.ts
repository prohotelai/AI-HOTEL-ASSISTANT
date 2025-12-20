import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Permission } from '@/lib/rbac'
import { getAdminDashboardData } from '@/lib/services/adminService'
import { handleRouteError, parseWithZod, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const querySchema = z.object({
  range: z
    .enum(['30', '90', '365'])
    .default('90'),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const queryParams = parseWithZod(querySchema, Object.fromEntries(url.searchParams.entries()))

    const admin = await requireAdminContext(Permission.ADMIN_VIEW)

    const data = await getAdminDashboardData(admin.hotelId)

    return NextResponse.json({
      hotel: data.hotel,
      metrics: data.metrics,
      bookingTrend: data.bookingTrend,
      ticketStatusBreakdown: data.ticketStatusBreakdown,
      knowledgeStatusBreakdown: data.knowledgeStatusBreakdown,
      rangeDays: Number(queryParams.range),
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
