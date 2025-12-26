/**
 * QR Code Service
 * Handles generation, validation, and management of QR login tokens
 * Supports both Guest and Staff authentication
 */

import { prisma } from '@/lib/db';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { requireNextAuthSecret } from '@/lib/env';

const JWT_SECRET = requireNextAuthSecret();
const TOKEN_EXPIRY_MINUTES = parseInt(process.env.QR_TOKEN_EXPIRY || '60', 10);
const HASH_ALGORITHM = 'sha256';

/**
 * QR Token payload structure
 */
export interface QRTokenPayload extends JwtPayload {
  hotelId: string;
  userId: string;
  role: 'guest' | 'staff';
  tokenId: string;
  type: 'qr-login';
}

/**
 * QR Token response structure
 */
export interface QRTokenResponse {
  id: string;
  hotelId: string;
  userId: string;
  token: string;
  role: 'guest' | 'staff';
  expiresAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Generate QR login token for a guest or staff member
 * @param hotelId - Hotel ID
 * @param userId - User ID
 * @param role - User role ('guest' | 'staff')
 * @param createdBy - Admin user ID who created the token
 * @param metadata - Optional metadata (device info, IP, etc.)
 */
export async function generateQRToken(
  hotelId: string,
  userId: string,
  role: 'guest' | 'staff',
  createdBy?: string,
  metadata?: Record<string, any>
): Promise<QRTokenResponse> {
  // Validate inputs
  if (!hotelId || !userId || !role) {
    throw new Error('Missing required parameters: hotelId, userId, role');
  }

  if (!['guest', 'staff'].includes(role)) {
    throw new Error('Invalid role. Must be "guest" or "staff"');
  }

  // Verify user exists and belongs to hotel
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  if (user.hotelId !== hotelId) {
    throw new Error(
      `User does not belong to hotel. User hotel: ${user.hotelId}, requested: ${hotelId}`
    );
  }

  if (user.isSuspended) {
    throw new Error('Cannot generate QR token for suspended user');
  }

  // Generate JWT token
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
  const tokenId = crypto.randomBytes(16).toString('hex');

  const payload: QRTokenPayload = {
    hotelId,
    userId,
    role,
    tokenId,
    type: 'qr-login',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const token = sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
  });

  // Store token in database
  const qrToken = await prisma.guestStaffQRToken.create({
    data: {
      hotelId,
      userId,
      token,
      role,
      expiresAt,
      createdBy,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return {
    id: qrToken.id,
    hotelId: qrToken.hotelId,
    userId: qrToken.userId || '',
    token,
    role: qrToken.role as 'guest' | 'staff',
    expiresAt: qrToken.expiresAt,
    isUsed: qrToken.isUsed,
    usedAt: qrToken.usedAt,
    createdAt: qrToken.createdAt,
  };
}

/**
 * Validate QR login token
 * Checks expiry, usage status, and signature
 * Marks token as used (one-time use enforcement)
 * @param token - JWT token
 * @param hotelId - Hotel ID (for validation)
 */
export async function validateQRToken(
  token: string,
  hotelId: string
): Promise<QRTokenPayload & { user: any }> {
  // Validate token signature and expiry
  let decoded: any;
  try {
    decoded = verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as QRTokenPayload;
  } catch (error: any) {
    throw new Error(`Invalid or expired token: ${error.message}`);
  }

  // Verify token is QR login type
  if (decoded.type !== 'qr-login') {
    throw new Error('Invalid token type. Expected qr-login');
  }

  // Verify hotel match
  if (decoded.hotelId !== hotelId) {
    throw new Error(`Hotel mismatch. Token hotel: ${decoded.hotelId}, requested: ${hotelId}`);
  }

  // Check if token exists in database
  const dbToken = await prisma.guestStaffQRToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          hotelId: true,
          isSuspended: true,
        },
      },
    },
  });

  if (!dbToken) {
    throw new Error('Token not found in database');
  }

  // Check if token has been revoked
  if (dbToken.revokedAt) {
    throw new Error('Token has been revoked');
  }

  // Check if token has been used (one-time use enforcement)
  if (dbToken.isUsed) {
    throw new Error('Token has already been used');
  }

  // Check expiry
  if (new Date() > dbToken.expiresAt) {
    throw new Error('Token has expired');
  }

  // Verify user still exists and belongs to hotel
  if (!dbToken.user || dbToken.user.hotelId !== hotelId) {
    throw new Error('Invalid user or hotel mismatch');
  }

  if (dbToken.user.isSuspended) {
    throw new Error('User is suspended');
  }

  // Mark token as used (one-time use)
  await prisma.guestStaffQRToken.update({
    where: { id: dbToken.id },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  return {
    ...decoded,
    user: dbToken.user,
  };
}

/**
 * Revoke a QR token
 * @param tokenId - Token ID
 * @param revokedBy - Admin user ID who revoked the token
 */
export async function revokeToken(tokenId: string, revokedBy?: string): Promise<void> {
  const token = await prisma.guestStaffQRToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    throw new Error(`Token not found: ${tokenId}`);
  }

  await prisma.guestStaffQRToken.update({
    where: { id: tokenId },
    data: {
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

/**
 * List all active QR tokens for a hotel
 * @param hotelId - Hotel ID
 * @param limit - Pagination limit
 * @param offset - Pagination offset
 */
export async function listActiveTokens(
  hotelId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  tokens: QRTokenResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}> {
  const now = new Date();

  const tokens = await prisma.guestStaffQRToken.findMany({
    where: {
      hotelId,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  const total = await prisma.guestStaffQRToken.count({
    where: {
      hotelId,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
  });

  return {
    tokens: tokens.map((t) => ({
      id: t.id,
      hotelId: t.hotelId,
      userId: t.userId || '',
      token: t.token,
      role: t.role as 'guest' | 'staff',
      expiresAt: t.expiresAt,
      isUsed: t.isUsed,
      usedAt: t.usedAt,
      createdAt: t.createdAt,
    })),
    pagination: {
      total,
      limit,
      offset,
    },
  };
}

/**
 * List all tokens for a specific user
 * @param userId - User ID
 * @param hotelId - Hotel ID (for verification)
 */
export async function getUserTokens(
  userId: string,
  hotelId: string
): Promise<QRTokenResponse[]> {
  const tokens = await prisma.guestStaffQRToken.findMany({
    where: {
      userId,
      hotelId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return tokens.map((t) => ({
    id: t.id,
    hotelId: t.hotelId,
    userId: t.userId || '',
    token: t.token,
    role: t.role as 'guest' | 'staff',
    expiresAt: t.expiresAt,
    isUsed: t.isUsed,
    usedAt: t.usedAt,
    createdAt: t.createdAt,
  }));
}

/**
 * Regenerate a token (revoke old, create new)
 * @param tokenId - Old token ID
 * @param regeneratedBy - Admin user ID
 */
export async function regenerateToken(
  tokenId: string,
  regeneratedBy?: string
): Promise<QRTokenResponse> {
  // Get old token
  const oldToken = await prisma.guestStaffQRToken.findUnique({
    where: { id: tokenId },
  });

  if (!oldToken) {
    throw new Error(`Token not found: ${tokenId}`);
  }

  // Revoke old token
  await revokeToken(tokenId, regeneratedBy);

  // Generate new token
  return generateQRToken(
    oldToken.hotelId,
    oldToken.userId || '',
    oldToken.role as 'guest' | 'staff',
    regeneratedBy,
    oldToken.metadata ? JSON.parse(oldToken.metadata) : undefined
  );
}

/**
 * Clean up expired tokens (for maintenance/cleanup jobs)
 * @param hotelId - Hotel ID (optional, if not provided, cleans up all)
 */
export async function cleanupExpiredTokens(hotelId?: string): Promise<number> {
  const now = new Date();

  const result = await prisma.guestStaffQRToken.deleteMany({
    where: {
      ...(hotelId && { hotelId }),
      expiresAt: {
        lt: now,
      },
      isUsed: true, // Only delete used and expired tokens
    },
  });

  return result.count;
}

/**
 * Get token statistics for a hotel
 * @param hotelId - Hotel ID
 */
export async function getTokenStats(hotelId: string): Promise<{
  total: number;
  active: number;
  used: number;
  expired: number;
  revoked: number;
  byRole: { guest: number; staff: number };
}> {
  const now = new Date();

  const [total, active, used, expired, revoked, byRole] = await Promise.all([
    // Total tokens
    prisma.guestStaffQRToken.count({
      where: { hotelId },
    }),
    // Active (not used, not expired, not revoked)
    prisma.guestStaffQRToken.count({
      where: {
        hotelId,
        isUsed: false,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
    // Used tokens
    prisma.guestStaffQRToken.count({
      where: { hotelId, isUsed: true },
    }),
    // Expired tokens
    prisma.guestStaffQRToken.count({
      where: { hotelId, expiresAt: { lte: now } },
    }),
    // Revoked tokens
    prisma.guestStaffQRToken.count({
      where: { hotelId, revokedAt: { not: null } },
    }),
    // Count by role
    prisma.guestStaffQRToken.groupBy({
      by: ['role'],
      where: { hotelId },
      _count: true,
    }),
  ]);

  const roleStats = {
    guest: byRole.find((r) => r.role === 'guest')?._count || 0,
    staff: byRole.find((r) => r.role === 'staff')?._count || 0,
  };

  return {
    total,
    active,
    used,
    expired,
    revoked,
    byRole: roleStats as { guest: number; staff: number },
  };
}
