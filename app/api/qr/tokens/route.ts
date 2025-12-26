export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/qr/tokens
 * List active QR tokens for a hotel
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/services/rbac/rbacService'
import { listActiveTokens, getTokenStats } from '@/lib/services/qr/qrService'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotelId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const includeStats = searchParams.get('stats') === 'true'

    if (!hotelId) {
      return NextResponse.json({ error: 'Missing required parameter: hotelId' }, { status: 400 })
    }

    const hasPermission = await checkPermission(session.user.id as string, hotelId, 'widget.qr.admin')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tokensData = await listActiveTokens(hotelId, limit, offset)
    const stats = includeStats ? await getTokenStats(hotelId) : null

    return NextResponse.json(
      {
        success: true,
        tokens: tokensData.tokens,
        pagination: tokensData.pagination,
        stats,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('List QR tokens error:', error)
    return NextResponse.json({ error: 'Failed to list QR tokens' }, { status: 500 })
  }
}
