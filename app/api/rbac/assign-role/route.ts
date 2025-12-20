/**
 * POST /api/rbac/assign-role
 * 
 * Assign a role to a user
 * 
 * Request body:
 * {
 *   userId: string,
 *   roleId: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { enforceRole } from '@/middleware/enforceRBAC'
import { assignRoleToUser } from '@/lib/services/rbac/rbacService'
import { RoleKey } from '@/lib/rbac/roleHierarchy'
import { getToken } from 'next-auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get auth context
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token || !token.id || !token.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const assignedBy = token.id as string
    const hotelId = token.hotelId as string

    // Check authorization - require admin or manager role
    const authCheck = await enforceRole(request, RoleKey.ADMIN)
    if (!authCheck.authorized) {
      // Try manager
      const managerCheck = await enforceRole(request, RoleKey.MANAGER)
      if (!managerCheck.authorized) {
        return NextResponse.json(
          { error: 'Insufficient permissions to assign roles' },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await request.json()
    const { userId, roleId } = body

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, roleId' },
        { status: 400 }
      )
    }

    // Assign role
    const result = await assignRoleToUser(userId, roleId, assignedBy, hotelId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to assign role' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Role assigned to user`,
    })
  } catch (error) {
    console.error('Error assigning role:', error)
    return NextResponse.json(
      { error: 'Failed to assign role' },
      { status: 500 }
    )
  }
}
