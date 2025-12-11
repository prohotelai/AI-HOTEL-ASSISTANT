import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
      // Create hotel
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          slug,
        }
      })

      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'admin',
          hotelId: hotel.id,
        }
      })

      return { hotel, user }
    })

    return NextResponse.json({
      message: 'Registration successful',
      hotel: {
        id: result.hotel.id,
        name: result.hotel.name,
        slug: result.hotel.slug,
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
