/**
 * POST /api/staff/invitations/[id]/resend - Resend invitation
 * POST /api/staff/invitations/[id]/cancel - Cancel invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import {
  resendStaffInvitation,
  cancelStaffInvitation,
  getStaffInvitation
} from '@/lib/services/invitationService'
import { generateStaffInvitationEmail } from '@/lib/email/templates/staffInvitation'

/**
 * POST /api/staff/invitations/[id]/resend
 * Resend invitation with new token
 */
export const POST = withPermission(Permission.STAFF_INVITE)(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const { pathname } = new URL(request.url)

  // Handle resend
  if (pathname.endsWith('/resend')) {
    try {
      const hotelId = user.hotelId

      // Verify invitation belongs to hotel
      const invitation = await getStaffInvitation(params.id)
      if (!invitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }

      if (invitation.hotelId !== hotelId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Resend invitation
      const result = await resendStaffInvitation(params.id)

      // Generate email
      const emailData = generateStaffInvitationEmail({
        firstName: result.invitation.firstName,
        lastName: result.invitation.lastName,
        hotelName: result.invitation.hotel?.name || 'Hotel',
        position: result.invitation.position || undefined,
        magicLink: result.magicLink,
        expiresAt: result.invitation.expiresAt,
        inviterName: session?.user?.name || undefined
      })

      // TODO: Send email
      console.log('[Resend Invitation Email]', {
        to: result.invitation.email,
        subject: emailData.subject,
        magicLink: result.magicLink
      })

      return NextResponse.json({
        success: true,
        invitation: result.invitation,
        magicLink: result.magicLink,
        message: 'Invitation resent successfully'
      })
    } catch (error: any) {
      console.error('[API] POST /api/staff/invitations/[id]/resend error:', error)

      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json(
        { error: 'Failed to resend invitation', details: error.message },
        { status: 500 }
      )
    }
  }

  // Handle cancel
  if (pathname.endsWith('/cancel')) {
    try {
      const hotelId = user.hotelId

      // Verify invitation belongs to hotel
      const invitation = await getStaffInvitation(params.id)
      if (!invitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }

      if (invitation.hotelId !== hotelId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Cancel invitation
      const cancelledInvitation = await cancelStaffInvitation(params.id)

      return NextResponse.json({
        success: true,
        invitation: cancelledInvitation,
        message: 'Invitation cancelled successfully'
      })
    } catch (error: any) {
      console.error('[API] POST /api/staff/invitations/[id]/cancel error:', error)

      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json(
        { error: 'Failed to cancel invitation', details: error.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
})
