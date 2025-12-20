import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { GuestContext } from '@/lib/pms/types'

/**
 * GET /api/pms/guest/:guestId
 * Retrieve guest profile with active stay information for QR login
 * Returns GuestContext with permissions and loyalty info
 */
export const GET = withPermission(Permission.ADMIN_VIEW)(async (
  request: NextRequest,
  { params }: { params: { guestId: string } }
) => {
  return NextResponse.json({ 
    success: false,
    error: 'PMS guest context not yet fully implemented'
  }, { status: 501 })
  
  /*
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    const { guestId } = params

    // Fetch guest with active stay
    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        hotelId: user.hotelId
      },
      include: {
        stays: {
          where: {
            status: 'CHECKED_IN',
            checkOutTime: {
              gt: new Date() // Future checkout time
            }
          },
          orderBy: { checkInTime: 'desc' },
          take: 1,
          include: {
            room: {
              select: {
                id: true,
                number: true
              }
            }
          }
        }
      }
    })

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    // Check if guest has active stay
    const activeStay = guest.stays[0]

    // Build guest context
    const guestContext: GuestContext = {
      guestId: guest.id,
      hotelId: user.hotelId,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      language: guest.language || 'en',
      vipStatus: guest.vipStatus || 'REGULAR',
      loyaltyTier: guest.loyaltyTier,
      loyaltyPoints: guest.loyaltyPoints,
      preferences: guest.preferences as Record<string, unknown> | null,
      permissions: {
        canAccessServices: !!activeStay,
        canRequestService: !!activeStay,
        canViewBill: !!activeStay,
        canOrderFood: !!activeStay,
        canRequestHousekeeping: !!activeStay
      }
    }

    return NextResponse.json({
      success: true,
      guestContext,
      hasActiveStay: !!activeStay
    })
  } catch (error: any) {
    console.error('Error fetching guest context:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guest context' },
      { status: 500 }
    )
  }
  */
})
