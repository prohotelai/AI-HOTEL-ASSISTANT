/**
 * GET /api/wizard/progress
 * POST /api/wizard/progress
 * 
 * Get or update AI Setup Wizard progress
 * - GET: Returns current wizard state (includes resume step)
 * - POST: Advances wizard to next step or completes it
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWizardState, resumeWizard, completeStep1, completeStep2, completeStep3, completeStep4 } from '@/lib/services/wizard/aiSetupWizardService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hotelId = (session.user as any).hotelId

    if (!hotelId) {
      return NextResponse.json(
        { error: 'Hotel context missing' },
        { status: 400 }
      )
    }

    const wizardState = await getWizardState(hotelId)

    // If wizard never started, initialize it
    const state = wizardState || await resumeWizard(hotelId)

    return NextResponse.json(state, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching wizard progress:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hotelId = (session.user as any).hotelId

    if (!hotelId) {
      return NextResponse.json(
        { error: 'Hotel context missing' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { action, step, data } = body

    let newState

    if (action === 'complete_step') {
      if (!step || !data) {
        return NextResponse.json(
          { error: 'step and data are required' },
          { status: 400 }
        )
      }

      if (step === 1) {
        newState = await completeStep1(hotelId, data)
      } else if (step === 2) {
        newState = await completeStep2(hotelId, data?.scannedUrl)
      } else if (step === 3) {
        newState = await completeStep3(hotelId, data)
      } else if (step === 4) {
        newState = await completeStep4(hotelId, data)
      } else {
        return NextResponse.json(
          { error: 'Invalid step' },
          { status: 400 }
        )
      }
    } else if (action === 'resume') {
      newState = await resumeWizard(hotelId)
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    return NextResponse.json(newState, { status: 200 })
  } catch (error: any) {
    console.error('Error updating wizard progress:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

