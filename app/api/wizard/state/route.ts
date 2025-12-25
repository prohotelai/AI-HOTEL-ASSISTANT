import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWizardState } from '@/lib/services/wizard/aiSetupWizardService'

/**
 * GET /api/wizard/state
 * 
 * Returns the wizard state for a hotel
 * Used by login flow to determine if user should be redirected to wizard
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hotelId = req.nextUrl.searchParams.get('hotelId')
    
    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this hotel
    const user = session.user as any
    if (user.hotelId !== hotelId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const wizardState = await getWizardState(hotelId)
    
    return NextResponse.json(wizardState)
  } catch (error) {
    console.error('Failed to get wizard state:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
