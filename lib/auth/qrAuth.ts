/**
 * QR Authentication Verification Utility
 * Validates QR session tokens and returns session data
 */

import { jwtVerify } from 'jose'
import { requireNextAuthSecret } from '@/lib/env'

const NEXTAUTH_SECRET_BYTES = new TextEncoder().encode(requireNextAuthSecret())

export type QRSession = {
  hotelId: string
  userId: string
  role: 'guest' | 'staff'
  user: {
    id: string
    email: string
    name: string
    role: 'guest' | 'staff'
    hotelId: string
  }
  permissions: string[]
  expiresAt: number
}

/**
 * Verify QR authentication token
 * @param token JWT token from QR login
 * @returns QR session data or null if invalid
 */
export async function verifyQRAuth(token: string): Promise<QRSession | null> {
  try {
    if (!token) {
      return null
    }

    // Verify JWT signature
    const { payload } = await jwtVerify(token, NEXTAUTH_SECRET_BYTES)

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    // Extract user and permission info
    const qrSession: QRSession = {
      hotelId: payload.hotelId as string,
      userId: payload.userId as string,
      role: payload.role as 'guest' | 'staff',
      user: {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as 'guest' | 'staff',
        hotelId: payload.hotelId as string,
      },
      permissions: (payload.permissions as string[]) || [],
      expiresAt: (payload.exp as number) || 0,
    }

    return qrSession
  } catch (error) {
    console.error('Error verifying QR auth token:', error)
    return null
  }
}

/**
 * Extract user info from QR session
 */
export function extractUserFromQR(qrSession: QRSession) {
  return {
    id: qrSession.userId,
    email: qrSession.user.email,
    name: qrSession.user.name,
    role: qrSession.role,
    hotelId: qrSession.hotelId,
    permissions: qrSession.permissions,
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(qrSession: QRSession, permission: string): boolean {
  return qrSession.permissions.includes(permission)
}

/**
 * Check if user has specific role
 */
export function hasRole(qrSession: QRSession, role: 'guest' | 'staff'): boolean {
  return qrSession.role === role
}
