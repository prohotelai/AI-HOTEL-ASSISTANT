import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { goToPreviousStep } from '@/lib/services/wizard/aiSetupWizardService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/wizard/back
 * 
 * Go back to previous wizard step
 * Allows users to edit previous answers
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

    const wizardState = await goToPreviousStep(hotelId)
    
    return NextResponse.json(wizardState, { status: 200 })
  } catch (error) {
    console.error('Failed to go back in wizard:', error)
    
    // Return user-friendly error for business logic errors
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const statusCode = errorMessage.includes('Cannot go back') ? 400 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
