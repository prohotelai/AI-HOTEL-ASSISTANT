export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Staff Invitation API
 * POST /api/onboarding/[hotelId]/invite-staff
 * GET /api/onboarding/[hotelId]/invite-staff
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { inviteStaff, getPendingInvitations, resendInvitation } from '@/lib/services/onboarding/staffInvitations'
import { logOnboardingEvent } from '@/lib/services/onboarding/onboardingService'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['manager', 'reception', 'staff', 'housekeeping', 'maintenance']),
})

/**
 * POST - Send staff invitation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token || token.hotelId !== params.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Only owner and manager can invite staff
    if (token.role !== 'owner' && token.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = inviteSchema.parse(body)

    const result = await inviteStaff(params.hotelId, {
      email: validated.email,
      role: validated.role,
      invitedBy: token.id as string,
    })

    await logOnboardingEvent(
      params.hotelId,
      'invite-staff',
      'invitation-sent',
      {
        email: validated.email,
        role: validated.role,
      }
    )

    return NextResponse.json({
      success: true,
      invitation: {
        id: result.id,
        email: result.email,
        inviteUrl: result.inviteUrl,
        expiresAt: result.expiresAt,
      },
    })
  } catch (error) {
    console.error('Staff invitation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Invitation failed', message: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET - List pending invitations
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token || token.hotelId !== params.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const invitations = await getPendingInvitations(params.hotelId)

    return NextResponse.json({
      success: true,
      invitations,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Resend invitation
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token || token.hotelId !== params.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { invitationId } = await req.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID required' },
        { status: 400 }
      )
    }

    const inviteUrl = await resendInvitation(invitationId)

    return NextResponse.json({
      success: true,
      inviteUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to resend invitation', message: String(error) },
      { status: 500 }
    )
  }
}
