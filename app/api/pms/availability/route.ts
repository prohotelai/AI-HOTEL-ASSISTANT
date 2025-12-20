export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { availabilityService } from '@/lib/services/pms/availabilityService'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { withPlanFeature } from '@/lib/subscription/planGuard'
import { z } from 'zod'

const availabilityQuerySchema = z.object({
  checkInDate: z.string().transform(str => new Date(str)),
  checkOutDate: z.string().transform(str => new Date(str)),
  roomTypeId: z.string().optional(),
  numberOfRooms: z.number().int().min(1).default(1)
})

// GET /api/pms/availability - Check availability
export const GET = withPermission(Permission.ADMIN_VIEW)(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    const { searchParams } = new URL(request.url)
    const checkInDate = searchParams.get('checkInDate')
    const checkOutDate = searchParams.get('checkOutDate')
    const roomTypeId = searchParams.get('roomTypeId') || undefined
    const numberOfRooms = parseInt(searchParams.get('numberOfRooms') || '1')

    if (!checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'checkInDate and checkOutDate are required' },
        { status: 400 }
      )
    }

    const query = availabilityQuerySchema.parse({
      checkInDate,
      checkOutDate,
      roomTypeId,
      numberOfRooms
    })

    const availability = await availabilityService.checkAvailability({
      hotelId: user.hotelId,
      ...query
    })

    return NextResponse.json({ availability })
  } catch (error: any) {
    console.error('Error checking availability:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
})
