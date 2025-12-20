import { NextResponse } from 'next/server'
import { Permission } from '@/lib/rbac'
import { handleRouteError, requireAdminContext } from '@/apps/dashboard/src/app/api/admin/utils'

const MOCK_AFFILIATES = [
  {
    id: 'mock-aff-1',
    name: 'City Tours Collective',
    commissionRate: 12,
    active: true,
    lastBookingAt: new Date().toISOString(),
  },
  {
    id: 'mock-aff-2',
    name: 'Airport Lounge Partners',
    commissionRate: 8,
    active: false,
    lastBookingAt: null,
  },
]

export async function GET() {
  try {
    await requireAdminContext(Permission.ADMIN_VIEW)

    return NextResponse.json({
      items: MOCK_AFFILIATES,
      integrationStatus: 'stubbed',
      todo: 'Replace with affiliates service integration',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
