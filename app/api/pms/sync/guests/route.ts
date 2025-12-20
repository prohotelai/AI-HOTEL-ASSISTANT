export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'

export const POST = withPermission(Permission.ADMIN_MANAGE)(async (request: NextRequest) => {
  return NextResponse.json(
    { error: 'PMS sync not implemented - PMSConfiguration model does not exist' },
    { status: 501 }
  )
})
