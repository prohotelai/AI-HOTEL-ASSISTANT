export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { z } from 'zod'

const checkoutSchema = z.object({
  bookingId: z.string(),
  generateInvoice: z.boolean().default(true),
  returnAllKeys: z.boolean().default(true),
  createHousekeepingTask: z.boolean().default(true),
  notes: z.string().optional()
})

// POST /api/pms/checkout - Check out guest
export const POST = withPermission(Permission.ADMIN_MANAGE)(async (request: NextRequest) => {
  return NextResponse.json({ 
    success: false,
    error: 'PMS feature not yet fully implemented'
  }, { status: 501 })
})
