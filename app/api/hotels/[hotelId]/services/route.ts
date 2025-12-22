import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

/**
 * POST /api/hotels/[hotelId]/services
 * Enable/disable AI services during onboarding
 * Note: Currently logs preferences but doesn't persist to Hotel model
 * (service fields can be added to Hotel schema in future)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    // Verify user belongs to this hotel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Only OWNER can enable/disable services
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only hotel owners can configure services' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { aiChat, analytics, privacyMode } = body

    // Validate input
    if (aiChat === undefined || analytics === undefined || privacyMode === undefined) {
      return NextResponse.json(
        { error: 'Service configuration required (aiChat, analytics, privacyMode)' },
        { status: 400 }
      )
    }

    // Log service preferences (in future, persist to Hotel model fields)
    console.log(`Hotel ${hotelId} service preferences:`, {
      aiChat: Boolean(aiChat),
      analytics: Boolean(analytics),
      privacyMode: Boolean(privacyMode),
    })

    // For now, just return success confirmation
    // TODO: Add aiChatEnabled, analyticsEnabled, privacyModeEnabled to Hotel schema
    return NextResponse.json({
      message: 'Services configured successfully',
      services: {
        aiChat: Boolean(aiChat),
        analytics: Boolean(analytics),
        privacyMode: Boolean(privacyMode),
      }
    })
  } catch (error) {
    console.error('Configure services error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
