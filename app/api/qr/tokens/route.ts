export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/qr/tokens
 * List active QR tokens for a hotel
 * Admin-only endpoint with pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import { listActiveTokens, getTokenStats } from '@/lib/services/qr/qrService';
import { withPermission } from '@/lib/middleware/rbac';
import { Permission } from '@/lib/rbac';
import { AuthContext } from '@/lib/auth/withAuth';

async function handleListTokens(request: NextRequest, ctx: AuthContext) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get('hotelId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeStats = searchParams.get('stats') === 'true';

    // Validate required fields
    if (!hotelId) {
      return NextResponse.json({ error: 'Missing required parameter: hotelId' }, { status: 400 });
    }

    // Enforce hotel scoping
    if (hotelId !== ctx.hotelId) {
      return NextResponse.json({ error: 'Forbidden - Cannot access other hotels tokens' }, { status: 403 });
    }

    // Get tokens
    const tokensData = await listActiveTokens(hotelId, limit, offset);

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getTokenStats(hotelId);
    }

    return NextResponse.json(
      {
        success: true,
        tokens: tokensData.tokens,
        pagination: {
          limit: tokensData.limit,
          offset: tokensData.offset,
          total: tokensData.total,
        },
        stats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('List QR tokens error:', error);

    return NextResponse.json(
      { error: 'Failed to list QR tokens' },
      { status: 500 }
    );
  }
}

export const GET = withPermission(Permission.ADMIN_VIEW)(handleListTokens)
