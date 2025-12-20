import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { StayContext } from '@/lib/pms/types'

/**
 * GET /api/pms/stay/:stayId
 * Retrieve complete stay details with guest and room information
 * Used for QR token validation and access control
 */
export const GET = withPermission(Permission.ADMIN_VIEW)(async (
  request: NextRequest,
  { params }: { params: { stayId: string } }
) => {
  return NextResponse.json(
    { error: 'Not Implemented' },
    { status: 501 }
  )
})
