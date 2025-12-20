export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { z } from 'zod'
import { StayContext } from '@/lib/pms/types'

const activeStayQuerySchema = z.object({
  guestId: z.string().optional(),
  roomId: z.string().optional()
})

/**
 * GET /api/pms/stay/active?guestId=...&roomId=...
 * Query for active stay(s) by guest or room
 * Returns the current active stay with full context
 */
export const GET = withPermission(Permission.ADMIN_VIEW)(async (request: NextRequest) => {
  return NextResponse.json(
    { error: 'Not Implemented' },
    { status: 501 }
  )
})
