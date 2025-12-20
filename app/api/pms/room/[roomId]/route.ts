export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'

/**
 * GET /api/pms/room/:roomId
 * Retrieve room details with current occupancy status
 * Includes information about current guest if checked in
 */
export const GET = withPermission(Permission.ADMIN_VIEW)(async (
  request: NextRequest,
  { params }: { params: { roomId: string } }
) => {
  return NextResponse.json({ 
    success: false,
    error: 'PMS feature not yet fully implemented'
  }, { status: 501 })
})
