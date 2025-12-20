export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { z } from 'zod'

const checkinSchema = z.object({
  bookingId: z.string(),
  roomId: z.string().optional(),
  identificationVerified: z.boolean().default(true),
  depositAmount: z.number().min(0).optional(),
  issueKey: z.boolean().default(true),
  keyType: z.enum(['PHYSICAL', 'CARD', 'MOBILE']).default('CARD'),
  notes: z.string().optional()
})

// POST /api/pms/checkin - Check in guest
export const POST = withPermission(Permission.ADMIN_MANAGE)(async (request: NextRequest) => {
  return NextResponse.json({ 
    success: false,
    error: 'PMS feature not yet fully implemented'
  }, { status: 501 })
})
