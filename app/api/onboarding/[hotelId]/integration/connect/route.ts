export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Integration Connect API
 * POST /api/onboarding/[hotelId]/integration/connect
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { logOnboardingEvent } from '@/lib/services/onboarding/onboardingService'
import { z } from 'zod'

const integrationSchema = z.object({
  type: z.enum(['pms', 'calendar', 'payment']),
  provider: z.string(),
  credentials: z.record(z.string(), z.string()).optional(),
})

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

    const body = await req.json()
    const validated = integrationSchema.parse(body)

    // Log integration request
    await logOnboardingEvent(
      params.hotelId,
      'integrations',
      'connection-requested',
      {
        type: validated.type,
        provider: validated.provider,
      }
    )

    // For onboarding, just track the intention
    // Actual integration setup happens in PMS module
    return NextResponse.json({
      success: true,
      message: 'Integration request recorded',
      type: validated.type,
      provider: validated.provider,
      status: 'pending_setup',
    })
  } catch (error) {
    console.error('Integration connect error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Connection failed', message: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET - List available integrations
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

    // Return available integrations
    const integrations = {
      pms: [
        { id: 'opera', name: 'Oracle Opera', status: 'available', logo: '/logos/opera.png' },
        { id: 'mews', name: 'Mews', status: 'available', logo: '/logos/mews.png' },
        { id: 'cloudbeds', name: 'Cloudbeds', status: 'available', logo: '/logos/cloudbeds.png' },
        { id: 'guesty', name: 'Guesty', status: 'available', logo: '/logos/guesty.png' },
      ],
      calendar: [
        { id: 'google', name: 'Google Calendar', status: 'available' },
        { id: 'outlook', name: 'Outlook Calendar', status: 'available' },
      ],
      payment: [
        { id: 'stripe', name: 'Stripe', status: 'available' },
        { id: 'square', name: 'Square', status: 'coming_soon' },
      ],
    }

    return NextResponse.json({
      success: true,
      integrations,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}
