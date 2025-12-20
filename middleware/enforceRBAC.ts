/**
 * RBAC Enforcement Middleware for Express/Next.js API Routes
 * 
 * Provides middleware and helper functions to enforce permissions on API endpoints.
 * Usage: Apply to route handlers to require specific permissions or roles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkPermission, checkRole, getUserRoleLevel } from '@/lib/services/rbac/rbacService'
import type { RoleKey } from '@/lib/rbac/roleHierarchy'

/**
 * Result of permission/role check
 */
export interface AuthCheckResult {
  authorized: boolean
  userId?: string
  hotelId?: string
  error?: string
}

/**
 * Extract user and hotel info from request
 */
export async function getAuthContext(
  request: NextRequest
): Promise<AuthCheckResult> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token || !token.id || !token.hotelId) {
      return {
        authorized: false,
        error: 'No valid session',
      }
    }

    return {
      authorized: true,
      userId: token.id as string,
      hotelId: token.hotelId as string,
    }
  } catch (error) {
    return {
      authorized: false,
      error: 'Failed to get auth context',
    }
  }
}

/**
 * Middleware factory: Require specific permission
 * 
 * Usage in API route:
 * ```
 * export async function GET(request: NextRequest) {
 *   const authCheck = await enforcePermission(request, 'pms.bookings.read')
 *   if (!authCheck.authorized) {
 *     return authCheckResponse(authCheck)
 *   }
 *   
 *   // Route logic here
 *   const { userId, hotelId } = authCheck
 * }
 * ```
 */
export async function enforcePermission(
  request: NextRequest,
  permissionKey: string
): Promise<AuthCheckResult> {
  const authContext = await getAuthContext(request)

  if (!authContext.authorized) {
    return authContext
  }

  const hasPermission = await checkPermission(
    authContext.userId!,
    authContext.hotelId!,
    permissionKey
  )

  if (!hasPermission) {
    return {
      authorized: false,
      error: `Missing required permission: ${permissionKey}`,
    }
  }

  return authContext
}

/**
 * Middleware factory: Require any of multiple permissions
 */
export async function enforceAnyPermission(
  request: NextRequest,
  permissionKeys: string[]
): Promise<AuthCheckResult> {
  const authContext = await getAuthContext(request)

  if (!authContext.authorized) {
    return authContext
  }

  const checks = await Promise.all(
    permissionKeys.map((key) =>
      checkPermission(authContext.userId!, authContext.hotelId!, key)
    )
  )

  if (!checks.some((check) => check)) {
    return {
      authorized: false,
      error: `Missing one of required permissions: ${permissionKeys.join(', ')}`,
    }
  }

  return authContext
}

/**
 * Middleware factory: Require all of multiple permissions
 */
export async function enforceAllPermissions(
  request: NextRequest,
  permissionKeys: string[]
): Promise<AuthCheckResult> {
  const authContext = await getAuthContext(request)

  if (!authContext.authorized) {
    return authContext
  }

  const checks = await Promise.all(
    permissionKeys.map((key) =>
      checkPermission(authContext.userId!, authContext.hotelId!, key)
    )
  )

  if (!checks.every((check) => check)) {
    return {
      authorized: false,
      error: `Missing required permissions: ${permissionKeys.join(', ')}`,
    }
  }

  return authContext
}

/**
 * Middleware factory: Require specific role
 */
export async function enforceRole(
  request: NextRequest,
  roleKey: RoleKey
): Promise<AuthCheckResult> {
  const authContext = await getAuthContext(request)

  if (!authContext.authorized) {
    return authContext
  }

  const hasRole = await checkRole(
    authContext.userId!,
    authContext.hotelId!,
    roleKey
  )

  if (!hasRole) {
    return {
      authorized: false,
      error: `Required role: ${roleKey}`,
    }
  }

  return authContext
}

/**
 * Middleware factory: Require any of multiple roles
 */
export async function enforceAnyRole(
  request: NextRequest,
  roleKeys: RoleKey[]
): Promise<AuthCheckResult> {
  const authContext = await getAuthContext(request)

  if (!authContext.authorized) {
    return authContext
  }

  const checks = await Promise.all(
    roleKeys.map((key) =>
      checkRole(authContext.userId!, authContext.hotelId!, key)
    )
  )

  if (!checks.some((check) => check)) {
    return {
      authorized: false,
      error: `Required role: one of ${roleKeys.join(', ')}`,
    }
  }

  return authContext
}

/**
 * Middleware factory: Require minimum role level
 */
export async function enforceMinimumRoleLevel(
  request: NextRequest,
  minimumLevel: number
): Promise<AuthCheckResult> {
  const authContext = await getAuthContext(request)

  if (!authContext.authorized) {
    return authContext
  }

  const userLevel = await getUserRoleLevel(
    authContext.userId!,
    authContext.hotelId!
  )

  if (userLevel === null || userLevel < minimumLevel) {
    return {
      authorized: false,
      error: `Required minimum role level: ${minimumLevel}`,
    }
  }

  return authContext
}

/**
 * Convert AuthCheckResult to NextResponse
 * 
 * Usage:
 * ```
 * const authCheck = await enforcePermission(request, 'pms.read')
 * if (!authCheck.authorized) {
 *   return authCheckResponse(authCheck)
 * }
 * ```
 */
export function authCheckResponse(
  authCheck: AuthCheckResult,
  statusCode?: number
): NextResponse {
  if (authCheck.authorized) {
    return NextResponse.json(
      { error: 'Invalid auth check response' },
      { status: 500 }
    )
  }

  const status = statusCode || 403
  const isAuthError = authCheck.error?.includes('session')

  return NextResponse.json(
    {
      error: authCheck.error || 'Access denied',
      code: isAuthError ? 'UNAUTHORIZED' : 'FORBIDDEN',
    },
    { status: isAuthError ? 401 : status }
  )
}

/**
 * Helper: Create 403 Forbidden response
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: message || 'Forbidden',
      code: 'FORBIDDEN',
    },
    { status: 403 }
  )
}

/**
 * Helper: Create 401 Unauthorized response
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: message || 'Unauthorized',
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  )
}
