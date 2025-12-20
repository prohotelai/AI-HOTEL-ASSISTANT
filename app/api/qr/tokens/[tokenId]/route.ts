export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/qr/tokens/[tokenId]
 * Revoke a QR token
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revokeToken } from '@/lib/services/qr/qrService';
import { withPermission } from '@/lib/middleware/rbac';
import { Permission } from '@/lib/rbac';

async function handleRevokeToken(
  request: NextRequest,
  context: { params: { tokenId: string } }
) {
  try {
    const { params } = context
    
    // Validate required fields
    if (!params.tokenId) {
      return NextResponse.json({ error: 'Missing required parameter: tokenId' }, { status: 400 });
    }

    // Get session to validate hotel ownership
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Revoke token (service layer will validate hotel ownership)
    await revokeToken(params.tokenId, session.user.id as string);

    return NextResponse.json(
      {
        success: true,
        message: 'QR token revoked successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Revoke QR token error:', error);

    if (error.message.includes('Token not found')) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to revoke QR token' },
      { status: 500 }
    );
  }
}

export const DELETE = withPermission(Permission.ADMIN_MANAGE)(handleRevokeToken)
