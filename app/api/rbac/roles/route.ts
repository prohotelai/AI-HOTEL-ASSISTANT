export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/rbac/roles
 * 
 * Get all roles for the user's hotel
 * 
 * Query parameters:
 * - includePermissions: (optional) Include full permission list for each role
 */

import { NextRequest, NextResponse } from 'next/server'
import { enforceRole } from '@/middleware/enforceRBAC'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
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

    const hotelId = token.hotelId as string
    const searchParams = request.nextUrl.searchParams
    const includePermissions = searchParams.get('includePermissions') === 'true'

    // Get roles for the hotel
    const roles = await prisma.role.findMany({
      where: { hotelId },
      include: {
        rolePermissions: includePermissions
          ? {
              include: {
                permission: true,
              },
            }
          : false,
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { level: 'desc' },
    })

    const formattedRoles = roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      level: role.level,
      description: role.description,
      permissionCount: Array.isArray(role.rolePermissions) ? role.rolePermissions.length : 0,
      userCount: role._count.userRoles,
      permissions: includePermissions && Array.isArray(role.rolePermissions)
        ? role.rolePermissions.map((rp: any) => rp.permission)
        : undefined,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }))

    return NextResponse.json({
      roles: formattedRoles,
      count: formattedRoles.length,
    })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}
