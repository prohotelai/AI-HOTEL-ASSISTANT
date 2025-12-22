export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createHotelAdminSignup } from '@/lib/services/adminSignupService'
import { badRequest, conflict, internalError } from '@/lib/api/errorHandler'

/**
 * HOTEL ADMIN REGISTRATION ENDPOINT
 * 
 * Purpose: Create OWNER account + Hotel in single transaction
 * 
 * Flow:
 * 1. Signup → Create OWNER user + Hotel (with hotelId H-XXXXX)
 * 2. Validate all fields (name, email, password, hotelName)
 * 3. On success → Redirect to /admin/login (then to /admin/onboarding)
 * 4. On failure → Return error (transaction rolls back)
 * 
 * Security:
 * - Passwords hashed with bcrypt cost 12
 * - Email must be unique
 * - Hotel creation is atomic with user creation
 * - No orphaned records on failure
 * - All errors caught, no raw 500s
 * - Comprehensive logging
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      return badRequest(
        'Invalid JSON in request body',
        { endpoint: '/api/register', method: 'POST' }
      )
    }

    const { name, email, password, hotelName } = body

    // Validate required fields
    if (!email || !password || !hotelName) {
      return badRequest(
        'Email, password, and hotel name are required',
        { endpoint: '/api/register', method: 'POST' },
        {
          missing: [
            !email && 'email',
            !password && 'password',
            !hotelName && 'hotelName'
          ].filter(Boolean)
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return badRequest(
        'Invalid email format',
        { endpoint: '/api/register', method: 'POST' }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return badRequest(
        'Password must be at least 8 characters long',
        { endpoint: '/api/register', method: 'POST' }
      )
    }

    // Validate hotel name
    if (typeof hotelName !== 'string' || hotelName.trim().length < 2) {
      return badRequest(
        'Hotel name must be at least 2 characters long',
        { endpoint: '/api/register', method: 'POST' }
      )
    }

    // Call service to create admin + hotel atomically
    // DB operation wrapped in try/catch at service level
    const result = await createHotelAdminSignup({
      name: name || '',
      email,
      password,
      hotelName,
    })

    // Return success with user and hotel info
    return NextResponse.json(
      {
        success: true,
        message: 'Hotel account created successfully',
        userId: result.userId,
        hotelId: result.hotelId,
        email: result.email,
        onboardingRequired: true,
      },
      { status: 201 }
    )

  } catch (error: any) {
    // Handle specific error types
    if (error.message?.includes('already exists') || error.message?.includes('Unique constraint')) {
      return conflict(
        'Email already registered',
        { endpoint: '/api/register', method: 'POST' }
      )
    }

    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return badRequest(
        error.message || 'Validation failed',
        { endpoint: '/api/register', method: 'POST' }
      )
    }

    // All other errors go through comprehensive error handler
    return internalError(
      error,
      { endpoint: '/api/register', method: 'POST' },
      'Registration failed. Please try again.'
    )
  }
}
