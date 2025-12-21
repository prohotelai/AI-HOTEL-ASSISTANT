export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SystemRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * ADMIN REGISTRATION ENDPOINT
 * 
 * Purpose: Create OWNER account ONLY
 * Hotel setup happens in /admin/onboarding wizard
 * 
 * Flow:
 * 1. Signup → Create OWNER user (hotelId = null)
 * 2. Login → Redirect to /admin/onboarding
 * 3. Onboarding → Create hotel + link user
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()
    const { name, email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password (bcrypt cost 10)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create OWNER user (no hotel yet - that happens in onboarding)
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: SystemRole.OWNER,
        hotelId: null, // Hotel created in onboarding wizard
        onboardingCompleted: false,
      }
    })

    console.log('User registered successfully:', { 
      userId: user.id, 
      email: user.email,
      role: user.role 
    })

    // Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        userId: user.id,
        email: user.email,
        onboardingRequired: true,
      },
      { status: 201 }
    )

  } catch (error: any) {
    // Log full error for debugging
    console.error('REGISTER_ERROR:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })

    // Check for specific database errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Registration failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
