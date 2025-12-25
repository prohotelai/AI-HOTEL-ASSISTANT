import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  completeStep1, 
  completeStep2, 
  completeStep3, 
  completeStep4,
  type WizardStep1Data,
  type WizardStep3Data,
  type WizardStep4Feedback
} from '@/lib/services/wizard/aiSetupWizardService'

/**
 * POST /api/wizard/complete-step
 * 
 * Completes a wizard step for the authenticated user's hotel
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

    const { step, data } = await req.json()
    
    if (!step || typeof step !== 'number' || step < 1 || step > 4) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      )
    }

    let result
    
    switch (step) {
      case 1:
        const step1Data: WizardStep1Data = data || {
          hotelName: user.hotelName || '',
          country: '',
          city: '',
          hotelType: 'Hotel'
        }
        result = await completeStep1(hotelId, step1Data)
        break
        
      case 2:
        result = await completeStep2(hotelId, data?.scannedUrl)
        break
        
      case 3:
        const step3Data: WizardStep3Data = data || {
          knowledge: '',
          confirmedItems: []
        }
        result = await completeStep3(hotelId, step3Data)
        break
        
      case 4:
        const step4Data: WizardStep4Feedback = data || {
          testQuestions: [],
          feedbackGiven: 0
        }
        result = await completeStep4(hotelId, step4Data)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid step' },
          { status: 400 }
        )
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to complete wizard step:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
