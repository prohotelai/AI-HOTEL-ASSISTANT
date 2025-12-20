/**
 * GET /api/session/me
 * 
 * Get current user session with roles and permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserRoles, getUserPermissions } from '@/lib/services/rbac/rbacService'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'

async function handleGetSession(request: NextRequest, ctx: AuthContext) {
  try {
    const userId = ctx.userId
    const hotelId = ctx.hotelId

    // Get user roles and permissions
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
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGetSession)
