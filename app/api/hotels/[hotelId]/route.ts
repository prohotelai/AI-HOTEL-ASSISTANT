import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

/**
 * GET /api/hotels/[hotelId]
 * Retrieve hotel details for authenticated user
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    // Verify user belongs to this hotel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Get hotel details
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
      }
    })

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ hotel })
  } catch (error) {
    console.error('Get hotel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/hotels/[hotelId]
 * Update hotel details during onboarding
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    // Verify user belongs to this hotel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Only OWNER can update hotel details
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only hotel owners can update hotel details' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { address, phone, email, website } = body

    // Validate input
    const updates: any = {}
    if (address !== undefined) updates.address = address
    if (phone !== undefined) updates.phone = phone
    if (email !== undefined) updates.email = email
    if (website !== undefined) updates.website = website

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update hotel
    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: updates,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
      }
    })

    return NextResponse.json({ hotel: updatedHotel })
  } catch (error) {
    console.error('Update hotel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
