import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seedDefaultRoles } from '@/lib/services/rbac/rbacService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const userRole = session.user.role

    // Only OWNER role can create hotel
    if (userRole !== 'OWNER' && userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only hotel owners can create a hotel' },
        { status: 403 }
      )
    }

    // Check if user already has a hotel
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true }
    })

    if (existingUser?.hotelId) {
      return NextResponse.json(
        { error: 'User already has a hotel' },
        { status: 400 }
      )
    }

    const { hotelName, slug, status } = await req.json()

    if (!hotelName || !slug) {
      return NextResponse.json(
        { error: 'Hotel name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingHotel = await prisma.hotel.findUnique({
      where: { slug }
    })

    if (existingHotel) {
      return NextResponse.json(
        { error: 'Hotel name already taken. Please choose a different name.' },
        { status: 400 }
      )
    }

    // Create hotel and link to user in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create hotel with DRAFT or ACTIVE status
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          slug,
          // Add status field support (will need to add to schema if not exists)
        }
      })

      // Update user with hotelId
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          hotelId: hotel.id,
          role: 'admin', // Promote to admin after creating hotel
        }
      })

      return { hotel, user }
    })

    // Seed default RBAC roles for the new hotel
    const rolesResult = await seedDefaultRoles(result.hotel.id)
    if (!rolesResult.success) {
      console.warn('Failed to seed default roles:', rolesResult.error)
    }

    return NextResponse.json({
      message: 'Hotel created successfully',
      hotel: {
        id: result.hotel.id,
        name: result.hotel.name,
        slug: result.hotel.slug,
      }
    })
  } catch (error) {
    console.error('Create hotel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
