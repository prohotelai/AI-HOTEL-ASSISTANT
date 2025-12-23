import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/staff/check-password
 * Check if staff member has password set
 */
export async function POST(req: NextRequest) {
  try {
    const { staffId } = await req.json()

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      hasPassword: false,  // staffPassword field removed - return false
    })
  } catch (error) {
    console.error('Check password error:', error)
    return NextResponse.json(
      { error: 'Failed to check password status' },
      { status: 500 }
    )
  }
}
