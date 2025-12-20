/**
 * POST /api/staff/invitations/accept - Accept invitation and create account
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateInvitationToken,
  acceptStaffInvitation
} from '@/lib/services/invitationService'
import { z } from 'zod'

// Validation schema
const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().datetime().optional()
})

/**
 * GET /api/staff/invitations/accept?token=...
 * Validate invitation token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const validation = await validateInvitationToken(token)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, valid: false },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: validation.invitation!.id,
        email: validation.invitation!.email,
        firstName: validation.invitation!.firstName,
        lastName: validation.invitation!.lastName,
        position: validation.invitation!.position,
        expiresAt: validation.invitation!.expiresAt
      }
    })
  } catch (error: any) {
    console.error('[API] GET /api/staff/invitations/accept error:', error)

    return NextResponse.json(
      { error: 'Failed to validate invitation', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/invitations/accept
 * Accept invitation and create user account
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate body
    const body = await request.json()
    const validation = acceptInvitationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Accept invitation
    const result = await acceptStaffInvitation({
      token: data.token,
      password: data.password,
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined
    })

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name
      },
      staffProfile: result.staffProfile,
      message: 'Registration completed successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/staff/invitations/accept error:', error)

    return NextResponse.json(
      { error: 'Failed to accept invitation', details: error.message },
      { status: 500 }
    )
  }
}
