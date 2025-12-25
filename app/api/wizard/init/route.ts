import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initializeWizard } from '@/lib/services/wizard/aiSetupWizardService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/wizard/init
 * 
 * Initialize wizard for a new hotel
 * Called during signup or first-time access
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

    const wizardState = await initializeWizard(hotelId)
    
    return NextResponse.json(wizardState, { status: 200 })
  } catch (error) {
    console.error('Failed to initialize wizard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
