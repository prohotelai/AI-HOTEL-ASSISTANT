export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/validate
 * Validate QR code and return session token
 * Public endpoint (validates QR token instead of session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateQRToken } from '@/lib/services/qr/qrService';
import { sign } from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import { requireNextAuthSecret } from '@/lib/env';

const JWT_SECRET = requireNextAuthSecret();
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10);

/**
 * Session response payload
 */
interface SessionPayload {
  userId: string;
  hotelId: string;
  role: 'guest' | 'staff';
  email: string;
  name: string | null;
  permissions: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { token, hotelId } = body;

    // Validate required fields
    if (!token || !hotelId) {
      return NextResponse.json(
        { error: 'Missing required fields: token, hotelId' },
        { status: 400 }
      );
    }

    // Validate QR token
    const qrPayload = await validateQRToken(token, hotelId);

    // Get user with permissions
    const user = await prisma.user.findUnique({
      where: { id: qrPayload.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract permissions from roles
    const permissionsSet = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionsSet.add(rp.permission.key);
      });
    });

    // Create session token
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
    const sessionPayload: SessionPayload & { exp: number } = {
      userId: user.id,
      hotelId,
      role: qrPayload.role,
      email: user.email,
      name: user.name,
      permissions: Array.from(permissionsSet),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const sessionToken = sign(sessionPayload, JWT_SECRET, {
      algorithm: 'HS256',
    });

    // Return session info
    return NextResponse.json(
      {
        success: true,
        session: {
          token: sessionToken,
          userId: user.id,
          hotelId,
          role: qrPayload.role,
          email: user.email,
          name: user.name,
          permissions: Array.from(permissionsSet),
          expiresAt: expiresAt.toISOString(),
        },
        message: 'QR token validated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('QR token validation error:', error);

    // Handle specific error cases
    if (error.message.includes('Invalid or expired token')) {
      return NextResponse.json({ error: 'Invalid or expired QR token' }, { status: 401 });
    }

    if (error.message.includes('Token has been used')) {
      return NextResponse.json(
        { error: 'QR token has already been used' },
        { status: 401 }
      );
    }

    if (error.message.includes('Token has been revoked')) {
      return NextResponse.json({ error: 'QR token has been revoked' }, { status: 401 });
    }

    if (error.message.includes('Hotel mismatch')) {
      return NextResponse.json({ error: 'Hotel mismatch' }, { status: 400 });
    }

    if (error.message.includes('Token not found')) {
      return NextResponse.json({ error: 'Invalid QR token' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to validate QR token' }, { status: 500 });
  }
}
