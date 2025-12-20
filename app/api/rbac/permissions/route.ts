export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/rbac/permissions
 * 
 * Get current user's permissions for their hotel
 * 
 * Query parameters:
 * - group: (optional) Filter by permission group
 * - includeAll: (optional) Include all available permissions (requires admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/middleware/enforceRBAC'
import { getUserPermissions } from '@/lib/services/rbac/rbacService'
import { getAllPermissions, getPermissionsByGroup } from '@/lib/rbac/permissions'

export async function GET(request: NextRequest) {
  try {
    // Check user is authenticated
    const authCheck = await enforcePermission(request, 'system.audit.read')
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'Unauthorized' },
        { status: authCheck.error?.includes('session') ? 401 : 403 }
      )
    }

    const { userId, hotelId } = authCheck
    const searchParams = request.nextUrl.searchParams
    const group = searchParams.get('group')
    const includeAll = searchParams.get('includeAll') === 'true'

    // Get user's permissions
    const userPermissions = await getUserPermissions(userId!, hotelId!)

    let allPermissions = getAllPermissions()

    // Filter by group if requested
    if (group) {
      allPermissions = allPermissions.filter((p) => p.group === group)
    }

    // Add user permission status to each permission
    const permissionsWithStatus = allPermissions.map((perm) => ({
      ...perm,
      granted: userPermissions.includes(perm.key),
    }))

    return NextResponse.json({
      permissions: permissionsWithStatus,
      userPermissions,
      summary: {
        total: allPermissions.length,
        granted: permissionsWithStatus.filter((p) => p.granted).length,
      },
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}
