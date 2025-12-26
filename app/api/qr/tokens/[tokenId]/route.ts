export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/qr/tokens/[tokenId]
 * Revoke a QR token
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/services/rbac/rbacService'
import { revokeToken } from '@/lib/services/qr/qrService'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  context: { params: { tokenId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tokenId = context.params?.tokenId
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

    await revokeToken(tokenId, session.user.id as string)

    return NextResponse.json({ success: true, message: 'QR token revoked successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Revoke QR token error:', error)

    if (error.message && error.message.includes('Token not found')) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to revoke QR token' }, { status: 500 })
  }
}
