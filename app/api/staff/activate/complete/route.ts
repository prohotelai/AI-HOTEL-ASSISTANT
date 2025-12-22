/**
 * Staff Account Creation Endpoint
 * Creates user, links to staff record, activates account
 * 
 * POST /api/staff/activate/complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { activateStaff } from '@/lib/services/staffActivationService'
import { signIn } from 'next-auth/react'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hotelId, staffId, password } = body

    // Validate required fields
    if (!hotelId || !staffId || !password) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'hotelId, staffId, and password are required'
        },
        { status: 400 }
      )
    }

    // Validate password strength (min 8 chars)
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Password must be at least 8 characters'
        },
        { status: 400 }
      )
    }

    // Activate staff and create user account
    const user = await activateStaff(hotelId, staffId, password)

    // Return success with user details (no password exposure)
    return NextResponse.json(
      {
        success: true,
        message: 'Account activated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Staff Activation] Error creating account:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: error.message
        },
        { status: 404 }
      )
    }

    if (error.message?.includes('already') || error.message?.includes('no longer')) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: error.message
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create staff account'
      },
      { status: 500 }
    )
  }
}
