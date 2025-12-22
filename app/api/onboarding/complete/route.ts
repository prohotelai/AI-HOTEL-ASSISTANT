import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Mark onboarding as completed for both user and hotel (atomic transaction)
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
        }
      })

      // Update hotel status
      await tx.hotel.update({
        where: { id: hotelId },
        data: {} // Hotel update not needed - onboarding progress tracks state
      })

      // Also initialize onboarding progress record if it exists
      try {
        await tx.onboardingProgress.upsert({
          where: { hotelId },
          create: {
            hotelId,
            currentStep: 'finish',
            stepsCompleted: ['welcome', 'profile', 'finish'],
            isCompleted: true,
            completedAt: new Date(),
            fastTrackMode: false,
          },
          update: {
            isCompleted: true,
            completedAt: new Date(),
          }
        })
      } catch (error) {
        console.warn('OnboardingProgress model may not exist:', error)
      }
    })

    return NextResponse.json({
      message: 'Onboarding completed successfully',
      onboardingCompleted: true,
    })
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
