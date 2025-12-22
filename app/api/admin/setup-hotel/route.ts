import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/setup-hotel
 * 
 * Recovery endpoint: Create and link a hotel for an admin without one
 * Used when an admin account exists but has no hotel
 * 
 * Request: { hotelName: string }
 * Response: { hotelId, hotelName }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in first' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    // Only OWNER users can create hotels via recovery
    if (userRole !== 'OWNER' && userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only hotel owners can create hotels' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { hotelName } = body

    // Validate input
    if (!hotelName || typeof hotelName !== 'string') {
      return NextResponse.json(
        { error: 'Hotel name is required' },
        { status: 400 }
      )
    }

    const trimmedName = hotelName.trim()
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Hotel name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Hotel name must be 100 characters or less' },
        { status: 400 }
      )
    }

    // Check if user already has a hotel
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true }
    })

    if (existingUser?.hotelId) {
      return NextResponse.json(
        { error: 'Your account is already linked to a hotel' },
        { status: 400 }
      )
    }

    // Generate unique hotel ID
    let hotelId = generateHotelId()
    let existingHotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    })

    while (existingHotel) {
      hotelId = generateHotelId()
      existingHotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      })
    }

    // Create hotel and link to user in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create hotel
      const hotel = await tx.hotel.create({
        data: {
          id: hotelId,
          name: trimmedName,
          slug: generateSlug(trimmedName),
          subscriptionPlan: SubscriptionPlan.STARTER,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        }
      })

      // Link user to hotel
      await tx.user.update({
        where: { id: userId },
        data: { hotelId: hotel.id }
      })

      return hotel
    })

    console.log('Hotel recovery successful:', {
      userId,
      hotelId: result.id,
      hotelName: result.name
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Hotel created successfully',
        hotelId: result.id,
        hotelName: result.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Hotel setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate unique hotelId
 * Format: H-{5 random chars} (e.g., H-AX2K9)
 */
function generateHotelId(): string {
  const randomPart = nanoid(5).toUpperCase()
  return `H-${randomPart}`
}

/**
 * Generate URL-friendly slug from hotel name
 * Example: "Sunset Beach Hotel" → "sunset-beach-hotel"
 */
function generateSlug(hotelName: string): string {
  return hotelName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
