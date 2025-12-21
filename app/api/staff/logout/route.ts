import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/staff/logout
 * 
 * Staff logout endpoint:
 * 1. Validates session token
 * 2. Deletes StaffSession
 * 3. Returns success
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 401 }
      )
    }

    // Find and delete the session
    const session = await prisma.staffSession.findUnique({
      where: { sessionToken }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    await prisma.staffSession.delete({
      where: { id: session.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Staff logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
