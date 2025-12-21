export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Mobile Auth API Routes
 * POST /api/mobile/auth/login - Email/password login
 * POST /api/mobile/auth/magic-link - Magic link login
 * POST /api/mobile/auth/refresh - Refresh JWT token
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sign, verify } from 'jsonwebtoken'
import { getEnv } from '@/lib/env'
import { applyRateLimit } from '@/lib/middleware/rateLimit'
import { createMagicLinkToken, consumeMagicLinkToken } from '@/lib/services/mobile/magicLinkService'
import { SystemRole } from '@prisma/client'

const { NEXTAUTH_SECRET: JWT_SECRET, MOBILE_MAGIC_LINK_SHARED_SECRET } = getEnv()
const PASSWORD_JWT_EXPIRY = '7d'
const MAGIC_LINK_JWT_EXPIRY = '30m'

const MOBILE_AUTH_ALLOWED_ROLES: SystemRole[] = [SystemRole.STAFF, SystemRole.MANAGER, SystemRole.OWNER]
const MAGIC_LINK_SECRET_HEADERS = ['x-mobile-auth-secret', 'x-mobile-magic-link-secret']

interface LoginRequest {
  email: string
  password: string
  hotelId: string
}

type MagicLinkAction = 'request' | 'redeem'

interface MagicLinkPayload {
  action?: MagicLinkAction
  email?: string
  hotelId?: string
  token?: string
  secret?: string
}

interface TokenResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
    hotelId: string
  }
  expiresIn: string
}

/**
 * POST /api/mobile/auth/login
 * Email + password login for mobile staff
 */
export async function POST(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname
    
    if (pathname.includes('/login')) {
      return handleLogin(request)
    } else if (pathname.includes('/magic-link')) {
      return handleMagicLink(request)
    } else if (pathname.includes('/refresh')) {
      return handleRefresh(request)
    }

    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 404 })
  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    )
  }
}

async function handleLogin(request: NextRequest): Promise<NextResponse> {
  const rateLimit = await applyRateLimit(request, 'MOBILE_AUTH_LOGIN')
  if (rateLimit) return rateLimit

  const { email, password, hotelId } = (await request.json()) as LoginRequest

  // Validate input
  if (!email || !password || !hotelId) {
    return NextResponse.json(
      { error: 'Email, password, and hotelId are required' },
      { status: 400 }
    )
  }

  // Find user by email
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      hotelId,
      role: { in: MOBILE_AUTH_ALLOWED_ROLES } // Only staff can use mobile app
    }
  })

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  if (user.isSuspended) {
    return NextResponse.json(
      { error: 'Account suspended' },
      { status: 403 }
    )
  }

  // Verify password
  const passwordMatch = await compare(password, user.password || '')
  if (!passwordMatch) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Generate JWT token
  const token = sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId
    },
    JWT_SECRET,
    { expiresIn: PASSWORD_JWT_EXPIRY }
  )

  // TODO: Add lastLogin field to User model if needed
  // await prisma.user.update({
  //   where: { id: user.id },
  //   data: { lastLogin: new Date() }
  // })

  const response: TokenResponse = {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role,
      hotelId: user.hotelId || ''
    },
    expiresIn: PASSWORD_JWT_EXPIRY
  }

  return NextResponse.json(response)
}

async function handleMagicLink(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as MagicLinkPayload
  const action: MagicLinkAction = payload.action ?? (payload.token ? 'redeem' : 'request')

  if (action === 'request') {
    const rateLimit = await applyRateLimit(request, 'MOBILE_AUTH_MAGIC_LINK_REQUEST')
    if (rateLimit) return rateLimit

    return processMagicLinkRequest(request, payload)
  }

  if (action === 'redeem') {
    const rateLimit = await applyRateLimit(request, 'MOBILE_AUTH_MAGIC_LINK_REDEEM')
    if (rateLimit) return rateLimit

    return processMagicLinkRedeem(request, payload)
  }

  return NextResponse.json({ error: 'Unsupported magic link action' }, { status: 400 })
}

async function processMagicLinkRequest(
  request: NextRequest,
  payload: MagicLinkPayload
): Promise<NextResponse> {
  if (!MOBILE_MAGIC_LINK_SHARED_SECRET) {
    console.error('Magic link request rejected: shared secret not configured')
    return NextResponse.json({ error: 'Magic link requests disabled' }, { status: 503 })
  }

  const providedSecret = getSharedSecretFromRequest(request, payload.secret)
  if (!providedSecret || !validateSharedSecret(providedSecret, MOBILE_MAGIC_LINK_SHARED_SECRET)) {
    return NextResponse.json({ error: 'Invalid shared secret' }, { status: 401 })
  }

  const { email, hotelId } = payload

  if (!email || !hotelId) {
    return NextResponse.json(
      { error: 'Email and hotelId are required' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      hotelId,
      role: { in: MOBILE_AUTH_ALLOWED_ROLES },
    },
  })

  if (!user) {
    // Return generic success response to avoid account enumeration
    return NextResponse.json({ success: true })
  }

  if (user.isSuspended) {
    // Soft-fail to avoid revealing suspension status via API
    console.warn('Magic link request blocked for suspended user', {
      userId: user.id,
      hotelId
    })
    return NextResponse.json({ success: true })
  }

  const { token, expiresAt } = await createMagicLinkToken({
    userId: user.id,
    hotelId,
    email: normalizedEmail,
  })

  return NextResponse.json({
    success: true,
    token,
    expiresAt: expiresAt.toISOString(),
  })
}

async function processMagicLinkRedeem(
  request: NextRequest,
  payload: MagicLinkPayload
): Promise<NextResponse> {
  const { email, hotelId, token } = payload

  if (!email || !hotelId || !token) {
    return NextResponse.json(
      { error: 'Email, hotelId, and token are required' },
      { status: 400 }
    )
  }

  const tokenResult = await consumeMagicLinkToken({
    token,
    email,
    hotelId,
    metadata: {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    },
  })

  if (!tokenResult.success || !tokenResult.userId) {
    return NextResponse.json(
      { error: tokenResult.error || 'Invalid or expired magic link' },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenResult.userId },
  })

  if (!user || user.email?.toLowerCase() !== email.toLowerCase() || user.hotelId !== hotelId) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  if (!MOBILE_AUTH_ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: 'Role not permitted for mobile access' },
      { status: 403 }
    )
  }

  if (user.isSuspended) {
    return NextResponse.json(
      { error: 'Account suspended' },
      { status: 403 }
    )
  }

  const jwt = sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
    },
    JWT_SECRET,
    { expiresIn: MAGIC_LINK_JWT_EXPIRY }
  )

  const response: TokenResponse = {
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role,
      hotelId: user.hotelId || '',
    },
    expiresIn: MAGIC_LINK_JWT_EXPIRY,
  }

  return NextResponse.json(response)
}

function getSharedSecretFromRequest(req: NextRequest, bodySecret?: string | null): string | null {
  for (const header of MAGIC_LINK_SECRET_HEADERS) {
    const value = req.headers.get(header)
    if (value) {
      return value
    }
  }

  if (bodySecret) {
    return bodySecret
  }

  return null
}

function validateSharedSecret(provided: string | null | undefined, expected: string): boolean {
  if (!provided) {
    return false
  }

  const normalized = provided.trim()
  if (!normalized) {
    return false
  }

  const providedBuffer = Buffer.from(normalized)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  try {
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  } catch (error) {
    console.error('Failed to verify shared secret:', error)
    return false
  }
}

async function handleRefresh(request: NextRequest): Promise<NextResponse> {
  const rateLimit = await applyRateLimit(request, 'MOBILE_AUTH_REFRESH')
  if (rateLimit) return rateLimit

  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const decoded = verify(token, JWT_SECRET) as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        hotelId: true,
        isSuspended: true,
      }
    })

    if (!user || user.hotelId !== decoded.hotelId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: 'Account suspended' },
        { status: 403 }
      )
    }

    // Generate new token
    const newToken = sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        hotelId: decoded.hotelId
      },
      JWT_SECRET,
      { expiresIn: PASSWORD_JWT_EXPIRY }
    )

    return NextResponse.json({
      token: newToken,
      expiresIn: PASSWORD_JWT_EXPIRY
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }
}

function getClientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return req.ip ?? null
}
