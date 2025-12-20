export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/tokens/[tokenId]/regenerate
 * Regenerate a QR token (revoke old, create new)
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { regenerateToken } from '@/lib/services/qr/qrService';


export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    // Get session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!params.tokenId) {
      return NextResponse.json({ error: 'Missing required parameter: tokenId' }, { status: 400 });
    }

    // Regenerate token
    const newToken = await regenerateToken(params.tokenId, session.user.id);

    return NextResponse.json(
      {
        success: true,
        token: newToken,
        message: 'QR token regenerated successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Regenerate QR token error:', error);

    if (error.message.includes('Token not found')) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to regenerate QR token' },
      { status: 500 }
    );
  }
}
