import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { skipToNextStep } from '@/lib/services/wizard/aiSetupWizardService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/wizard/skip
 * 
 * Skip current step and move to next
 * Marks step as skipped for analytics
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user as any
    const hotelId = user.hotelId
    
    if (!hotelId) {
      return NextResponse.json(
        { error: 'No hotel associated with user' },
        { status: 400 }
      )
    }

    const wizardState = await skipToNextStep(hotelId)
    
    return NextResponse.json(wizardState, { status: 200 })
  } catch (error) {
    console.error('Failed to skip wizard step:', error)
    
    // Return user-friendly error for business logic errors
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const statusCode = errorMessage.includes('Cannot skip') ? 400 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
