/**
 * POST /api/qr/generate
 * Generate QR code login token for guest or staff
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateQRToken } from '@/lib/services/qr/qrService';
import { withPermission } from '@/lib/middleware/rbac';
import { Permission } from '@/lib/rbac';
import { AuthContext } from '@/lib/auth/withAuth';

async function handleQRGenerate(request: NextRequest, ctx: AuthContext) {
  try {
    // Parse request body
    const body = await request.json();
    const { hotelId, userId, role, metadata } = body;

    // Validate required fields
    if (!hotelId || !userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: hotelId, userId, role' },
        { status: 400 }
      );
    }

    // Enforce hotel scoping - admins can only generate tokens for their own hotel
    if (hotelId !== ctx.hotelId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot generate tokens for other hotels' },
        { status: 403 }
      );
    }

    if (!['guest', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "guest" or "staff"' },
        { status: 400 }
      );
    }

    // Generate token
    const token = await generateQRToken(hotelId, userId, role, ctx.userId, metadata);

    return NextResponse.json(
      {
        success: true,
        token,
        message: 'QR token generated successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('QR token generation error:', error);

    // Handle specific error cases
    if (error.message.includes('User not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('does not belong to hotel')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message.includes('Invalid role')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to generate QR token' },
      { status: 500 }
    );
  }
}

export const POST = withPermission(Permission.ADMIN_MANAGE)(handleQRGenerate)
