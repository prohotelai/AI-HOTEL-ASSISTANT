export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { withPlanFeature } from '@/lib/subscription/planGuard'

const createBookingSchema = z.object({
  guestId: z.string(),
  roomTypeId: z.string(),
  ratePlanId: z.string(),
  checkInDate: z.string().transform(str => new Date(str)),
  checkOutDate: z.string().transform(str => new Date(str)),
  numberOfAdults: z.number().int().min(1),
  numberOfChildren: z.number().int().min(0).default(0),
  totalAmount: z.number().min(0),
  specialRequests: z.string().optional()
})

// GET /api/pms/bookings - List bookings (requires PMS_INTEGRATION)
const getBookingsHandler = withPermission(Permission.ADMIN_VIEW)(async (request: NextRequest) => {
  return NextResponse.json({ 
    success: false,
    error: 'PMS bookings not yet fully implemented'
  }, { status: 501 })
})

export const GET = withPlanFeature('PMS_INTEGRATION')(getBookingsHandler)

// POST /api/pms/bookings - Create booking (requires PMS_INTEGRATION)
const createBookingHandler = withPermission(Permission.ADMIN_MANAGE)(async (request: NextRequest) => {
  return NextResponse.json({ 
    success: false,
    error: 'PMS bookings not yet fully implemented'
  }, { status: 501 })
})

export const POST = withPlanFeature('PMS_INTEGRATION')(createBookingHandler)
