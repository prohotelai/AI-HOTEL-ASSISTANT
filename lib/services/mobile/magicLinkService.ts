/**
 * Mobile Magic Link Service
 * Handles creation and consumption of single-use magic link tokens
 */

import { prisma } from '@/lib/prisma'
import { generateToken, hashToken } from '@/lib/security/tokenUtils'

const DEFAULT_EXPIRATION_MINUTES = 15

type CreateMagicLinkOptions = {
  userId: string
  hotelId: string
  email: string
  expiresInMinutes?: number
}

type ConsumeMagicLinkOptions = {
  token: string
  email: string
  hotelId: string
  metadata?: {
    ip?: string | null
    userAgent?: string | null
  }
}

export async function createMagicLinkToken({
  userId,
  hotelId,
  email,
  expiresInMinutes = DEFAULT_EXPIRATION_MINUTES,
}: CreateMagicLinkOptions): Promise<{ token: string; expiresAt: Date }> {
  const normalizedEmail = email.trim().toLowerCase()
  const token = generateToken(32)
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000)

  // Invalidate any previously issued tokens that are still unused
  await prisma.mobileMagicLinkToken.updateMany({
    where: {
      userId,
      hotelId,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  })

  await prisma.mobileMagicLinkToken.create({
    data: {
      userId,
      hotelId,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export async function consumeMagicLinkToken({
  token,
  email,
  hotelId,
  metadata,
}: ConsumeMagicLinkOptions): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  const normalizedEmail = email.trim().toLowerCase()
  const tokenHash = hashToken(token)
  const now = new Date()

  const record = await prisma.mobileMagicLinkToken.findUnique({
    where: { tokenHash },
  })

  if (!record) {
    return { success: false, error: 'Invalid or expired magic link' }
  }

  if (record.hotelId !== hotelId || record.email !== normalizedEmail) {
    return { success: false, error: 'Magic link details do not match' }
  }

  if (record.usedAt) {
    return { success: false, error: 'Magic link already used' }
  }

  if (record.expiresAt < now) {
    return { success: false, error: 'Magic link expired' }
  }

  await prisma.mobileMagicLinkToken.update({
    where: { id: record.id },
    data: {
      usedAt: now,
      usedByIp: metadata?.ip || null,
      userAgent: metadata?.userAgent || null,
    },
  })

  return { success: true, userId: record.userId }
}
