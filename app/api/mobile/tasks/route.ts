export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Mobile Tasks API Routes
 * GET /api/mobile/tasks - Get tasks for staff
 * POST /api/mobile/tasks - Create new task
 * PUT /api/mobile/tasks - Update task (with offline sync)
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

interface TaskCreateRequest {
  roomNumber: string
  type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  description?: string
  dueTime?: string
}

interface TaskUpdateRequest {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  completedAt?: string
  notes?: string
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
 * GET /api/mobile/tasks
 * Get all tasks for the staff member
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

/**
 * POST /api/mobile/tasks
 * Create a new housekeeping task
 */
export async function POST(request: NextRequest) {
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

/**
 * PUT /api/mobile/tasks
 * Update task status (supports offline sync with idempotency)
 */
export async function PUT(request: NextRequest) {
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
