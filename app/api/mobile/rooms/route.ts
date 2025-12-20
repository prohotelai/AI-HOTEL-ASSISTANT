/**
 * Mobile Rooms API Routes
 * GET /api/mobile/rooms - Get all rooms for hotel
 * GET /api/mobile/rooms/[id] - Get room details with tasks
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify } from 'jsonwebtoken'
import { requireNextAuthSecret } from '@/lib/env'

const JWT_SECRET = requireNextAuthSecret()

interface MobileUser {
  id: string
  email: string
  role: string
  hotelId: string
}

/**
 * Authenticate request using Bearer token
 */
function authenticateRequest(request: NextRequest): MobileUser | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.slice(7)
    const decoded = verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      hotelId: decoded.hotelId
    }
  } catch (error) {
    return null
  }
}

/**
 * GET /api/mobile/rooms
 * Get all rooms for the hotel with current status
 */
export async function GET(request: NextRequest) {
  const user = authenticateRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json(
    { error: 'Mobile API not yet fully implemented' },
    { status: 501 }
  )
}
