import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { availabilityService } from '@/lib/services/pms/availabilityService'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { z } from 'zod'

// GET /api/pms/availability/calendar - Get daily availability calendar
export const GET = withPermission(Permission.ADMIN_VIEW)(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const roomTypeId = searchParams.get('roomTypeId') || undefined

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const calendar = await availabilityService.getDailyAvailabilityCalendar(
      user.hotelId,
      new Date(startDate),
      new Date(endDate),
      roomTypeId
    )

    return NextResponse.json({ calendar })
  } catch (error: any) {
    console.error('Error fetching availability calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability calendar' },
      { status: 500 }
    )
  }
})
