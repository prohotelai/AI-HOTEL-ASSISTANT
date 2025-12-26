export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/generate
 * Generate a QR login token for a guest or staff user.
 * Requires authentication and permission check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/services/rbac/rbacService'
import { generateQRToken } from '@/lib/services/qr/qrService'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hotelId, userId, role } = body || {}

    if (!hotelId || !userId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hasPermission = await checkPermission(session.user.id as string, hotelId, 'widget.qr.manage')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!['guest', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const token = await generateQRToken(hotelId, userId, role, session.user.id as string)

    return NextResponse.json({ success: true, token }, { status: 201 })
  } catch (error) {
    console.error('QR generate error:', error)
    return NextResponse.json({ error: 'Failed to generate QR token' }, { status: 500 })
  }
}
