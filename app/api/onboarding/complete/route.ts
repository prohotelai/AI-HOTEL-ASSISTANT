import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completeOnboarding } from '@/lib/services/onboarding/onboardingStepService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = await req.json()

    // Verify user belongs to this hotel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, onboardingCompleted: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'User does not belong to this hotel' },
        { status: 403 }
      )
    }

    // Mark onboarding as completed using service layer
    await prisma.$transaction(async (tx) => {
      // Update user to mark onboarding completed
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
        }
      })
    })

    // Mark the wizard as COMPLETED in onboarding progress
    const result = await completeOnboarding(hotelId)

    return NextResponse.json({
      message: 'Onboarding completed successfully',
      onboardingCompleted: true,
      progress: result.progress,
    })
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
