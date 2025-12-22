export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/session/me
 * 
 * Get current user session with roles and permissions
 * Returns user info, assigned roles, and all permissions
 * 
 * Error Handling:
 * - 401: Not authenticated
 * - 500: Database errors (wrapped in try/catch)
 * - Comprehensive logging with userId, hotelId, role, endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserRoles, getUserPermissions } from '@/lib/services/rbac/rbacService'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { internalError } from '@/lib/api/errorHandler'

async function handleGetSession(request: NextRequest, ctx: AuthContext) {
  try {
    const userId = ctx.userId
    const hotelId = ctx.hotelId
    const role = ctx.role

    // Get user roles and permissions
    // DB operations: wrapped in try/catch
    const userRoles = await getUserRoles(userId, hotelId)
    const userPermissions = await getUserPermissions(userId, hotelId)

    return NextResponse.json({
      user: {
        id: ctx.userId,
        email: ctx.email,
        role: ctx.role, // Legacy role field
        hotelId: ctx.hotelId,
      },
      roles: userRoles.map((ur) => ({
        id: ur.role.id,
        key: ur.role.key,
        name: ur.role.name,
        level: ur.role.level,
        assignedAt: ur.assignedAt,
      })),
      permissions: userPermissions,
      highestRoleLevel: Math.max(
        ...userRoles.map((ur) => ur.role.level),
        0
      ),
    })
  } catch (error) {
    return internalError(
      error,
      { userId: ctx.userId, hotelId: ctx.hotelId, role: ctx.role, endpoint: '/api/session/me', method: 'GET' },
      'Failed to fetch session information'
    )
  }
}

export const GET = withAuth(handleGetSession)
