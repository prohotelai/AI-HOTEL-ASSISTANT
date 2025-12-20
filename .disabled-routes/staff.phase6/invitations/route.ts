/**
 * GET /api/staff/invitations - List invitations
 * POST /api/staff/invitations - Send invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import {
  sendStaffInvitation,
  resendStaffInvitation,
  listStaffInvitations,
  cancelStaffInvitation
} from '@/lib/services/invitationService'
import { generateStaffInvitationEmail } from '@/lib/email/templates/staffInvitation'
import { z } from 'zod'

// Validation schemas
const sendInvitationSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  departmentId: z.string().cuid().optional(),
  position: z.string().optional(),
  role: z.enum(['owner', 'manager', 'reception', 'staff']).optional()
})

/**
 * GET /api/staff/invitations
 * List all invitations for hotel
 */
export const GET = withPermission(Permission.STAFF_INVITE)(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any

    const invitations = await listStaffInvitations(hotelId, status)

    return NextResponse.json({
      success: true,
      invitations
    })
  } catch (error: any) {
    console.error('[API] GET /api/staff/invitations error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch invitations', details: error.message },
      { status: 500 }
    )
  }
})

/**
 * POST /api/staff/invitations
 * Send new staff invitation
 */
export const POST = withPermission(Permission.STAFF_INVITE)(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  try {
    const hotelId = user.hotelId
    const inviterId = user.id

    // Parse and validate body
    const body = await request.json()
    const validation = sendInvitationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Send invitation
    const result = await sendStaffInvitation({
      hotelId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      departmentId: data.departmentId,
      position: data.position,
      role: data.role,
      invitedBy: inviterId
    })

    // Generate email content
    const emailData = generateStaffInvitationEmail({
      firstName: result.invitation.firstName,
      lastName: result.invitation.lastName,
      hotelName: result.invitation.hotel?.name || 'Hotel',
      position: result.invitation.position || undefined,
      magicLink: result.magicLink,
      expiresAt: result.invitation.expiresAt,
      inviterName: session?.user?.name || undefined
    })

    // TODO: Send email via email service (e.g., SendGrid, AWS SES)
    // For now, we'll just log it
    console.log('[Invitation Email]', {
      to: data.email,
      subject: emailData.subject,
      magicLink: result.magicLink
    })

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      magicLink: result.magicLink, // Include in response for testing
      message: 'Invitation sent successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/staff/invitations error:', error)

    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to send invitation', details: error.message },
      { status: 500 }
    )
  }
})
