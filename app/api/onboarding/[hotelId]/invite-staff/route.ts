export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Staff Invitation API
 * POST /api/onboarding/[hotelId]/invite-staff
 * GET /api/onboarding/[hotelId]/invite-staff
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
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
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'This endpoint is no longer supported. Staff invitations are handled separately from onboarding.',
      newInfo: 'Use the staff management system to invite team members after onboarding is complete.',
    },
    { status: 410 }
  )
}


/**
 * GET - List pending invitations (deprecated)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'This endpoint is no longer supported.',
    },
    { status: 410 }
  )
}
