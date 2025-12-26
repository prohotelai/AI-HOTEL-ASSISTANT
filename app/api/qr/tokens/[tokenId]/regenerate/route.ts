export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/tokens/[tokenId]/regenerate
 * Regenerate a QR token (revoke old, create new)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/services/rbac/rbacService'
import { regenerateToken } from '@/lib/services/qr/qrService'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tokenId = params?.tokenId
    if (!tokenId) {
      return NextResponse.json({ error: 'Missing required parameter: tokenId' }, { status: 400 })
    }

    // Fetch token to get hotelId
    const token = await prisma.guestStaffQRToken.findUnique({
      where: { id: tokenId },
      select: { hotelId: true }
    })
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const hasPermission = await checkPermission(session.user.id as string, token.hotelId, 'widget.qr.admin')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newToken = await regenerateToken(tokenId, session.user.id)

    return NextResponse.json(
      { success: true, token: newToken, message: 'QR token regenerated successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Regenerate QR token error:', error)

    if (error.message && error.message.includes('Token not found')) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to regenerate QR token' }, { status: 500 })
  }
}
