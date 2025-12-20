export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'

/**
 * GET /api/ticket-tags
 * List all ticket tags
 * 
 * Feature not yet fully implemented (ticketTag model doesn't exist)
 */
export const GET = withPermission(Permission.TICKETS_VIEW)(async () => {
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
})

/**
 * POST /api/ticket-tags
 * Create a new ticket tag
 * 
 * Feature not yet fully implemented (ticketTag model doesn't exist)
 */
export const POST = withPermission(Permission.TICKETS_CREATE)(async (request: NextRequest) => {
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
})
