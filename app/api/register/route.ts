export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createHotelAdminSignup } from '@/lib/services/adminSignupService'
import { badRequest, conflict, internalError } from '@/lib/api/errorHandler'

/**
 * HOTEL ADMIN REGISTRATION ENDPOINT
 * 
 * Purpose: Create OWNER account + Hotel in single atomic transaction
 * 
 * Flow:
 * 1. Validate all input fields (name, email, password, hotelName)
 * 2. Check email uniqueness in database
 * 3. Hash password with bcrypt cost 12 (strong for admin)
 * 4. Create User + Hotel in single transaction:
 *    - User: role=OWNER, hotelId=generated hotel.id, onboardingCompleted=false
 *    - Hotel: name from hotelName input, subscriptionPlan=STARTER, status=ACTIVE
 * 5. On success → Return { userId, hotelId } for session creation
 * 6. On failure → Transaction rolls back (no orphaned records)
 * 
 * CRITICAL: Hotel MUST be created at signup time
 * - Onboarding wizard assumes hotel exists
 * - If hotel missing after signup → wizard will show fatal error
 * - Never delay hotel creation to onboarding step
 * 
 * Security:
 * - Passwords hashed with bcrypt cost 12 (stronger than typical cost 10)
 * - Email must be unique (Prisma constraint enforced)
 * - Hotel creation is atomic with user creation
 * - No orphaned records on failure (transaction rolls back)
 * - All errors caught, no raw 500s
 * - Comprehensive logging with context
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

    // ASSERTION: Both user and hotel were created
    if (!result.userId || !result.hotelId) {
      console.error('Registration service returned incomplete result:', {
        userId: !!result.userId,
        hotelId: !!result.hotelId
      })
      return internalError(
        new Error('User or hotel creation failed - incomplete result'),
        { endpoint: '/api/register', method: 'POST' },
        'Registration failed. Please try again.'
      )
    }

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
