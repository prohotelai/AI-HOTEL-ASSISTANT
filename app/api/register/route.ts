export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SystemRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedDefaultRoles } from '@/lib/services/rbac/rbacService'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, hotelName } = await req.json()

    // Validate input
    if (!name || !email || !password || !hotelName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create hotel slug from name
    const slug = hotelName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

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

    // Create hotel and user in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create hotel (DRAFT status - will be activated after onboarding)
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          slug,
        }
      })

      // Create user with OWNER role and link to hotel
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: SystemRole.OWNER,
          hotelId: hotel.id,
          onboardingCompleted: false,
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
      message: 'Registration successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        hotelId: result.user.hotelId,
        onboardingCompleted: result.user.onboardingCompleted,
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
