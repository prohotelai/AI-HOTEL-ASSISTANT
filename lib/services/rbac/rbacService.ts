/**
 * RBAC Service Engine
 * 
 * Provides core permission checking, enforcement, and role hierarchy logic.
 * Handles multi-tenant permission validation and role-based access control.
 */

import { prisma } from '@/lib/prisma'
import { getPermission, isValidPermission } from '@/lib/rbac/permissions'
import {
  DEFAULT_ROLES,
  RoleKey,
  getRolePermissions,
  canAssignRole,
} from '@/lib/rbac/roleHierarchy'

/**
 * Check if a user has a specific permission
 * 
 * @param userId - The user ID to check
 * @param hotelId - The hotel/tenant ID (must match user's hotel)
 * @param permissionKey - The permission to check
 * @returns true if user has permission, false otherwise
 */
export async function checkPermission(
  userId: string,
  hotelId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    // Validate permission key
    if (!isValidPermission(permissionKey)) {
      console.warn(`Invalid permission key: ${permissionKey}`)
      return false
    }

    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      return false
    }

    // Verify hotel isolation (user belongs to this hotel)
    if (user.hotelId !== hotelId) {
      console.warn(
        `Hotel mismatch: user ${userId} hotel ${user.hotelId} != requested ${hotelId}`
      )
      return false
    }

    // Collect all permissions from user's roles
    const userPermissions = new Set<string>()

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        userPermissions.add(rolePermission.permission.key)
      }
    }

    // Check if user has the permission
    return userPermissions.has(permissionKey)
  } catch (error) {
    console.error(`Error checking permission for user ${userId}:`, error)
    return false
  }
}

/**
 * Check if a user has multiple permissions (all must be true)
 */
export async function checkAllPermissions(
  userId: string,
  hotelId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const checks = await Promise.all(
    permissionKeys.map((key) => checkPermission(userId, hotelId, key))
  )
  return checks.every((check) => check)
}

/**
 * Check if a user has at least one permission
 */
export async function checkAnyPermission(
  userId: string,
  hotelId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const checks = await Promise.all(
    permissionKeys.map((key) => checkPermission(userId, hotelId, key))
  )
  return checks.some((check) => check)
}

/**
 * Check if a user has a specific role
 */
export async function checkRole(
  userId: string,
  hotelId: string,
  roleKey: RoleKey
): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          hotelId,
          key: roleKey,
        },
      },
    })

    return !!userRole
  } catch (error) {
    console.error(`Error checking role for user ${userId}:`, error)
    return false
  }
}

/**
 * Check if a user has any of the specified roles
 */
export async function checkAnyRole(
  userId: string,
  hotelId: string,
  roleKeys: RoleKey[]
): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          hotelId,
          key: {
            in: roleKeys,
          },
        },
      },
    })

    return !!userRole
  } catch (error) {
    console.error(`Error checking roles for user ${userId}:`, error)
    return false
  }
}

/**
 * Get the highest role level for a user in a hotel
 */
export async function getUserRoleLevel(
  userId: string,
  hotelId: string
): Promise<number | null> {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          hotelId,
        },
      },
      include: {
        role: true,
      },
    })

    if (userRoles.length === 0) {
      return null
    }

    // Return the highest level
    return Math.max(...userRoles.map((ur) => ur.role.level))
  } catch (error) {
    console.error(
      `Error getting user role level for user ${userId}:`,
      error
    )
    return null
  }
}

/**
 * Get all roles for a user in a hotel
 */
export async function getUserRoles(userId: string, hotelId: string) {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          hotelId,
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    })

    return userRoles.map((ur) => ({
      role: ur.role,
      assignedAt: ur.assignedAt,
      assignedBy: ur.assignedBy,
    }))
  } catch (error) {
    console.error(`Error getting roles for user ${userId}:`, error)
    return []
  }
}

/**
 * Get all permissions for a user in a hotel
 */
export async function getUserPermissions(userId: string, hotelId: string) {
  try {
    const userRoles = await getUserRoles(userId, hotelId)

    const permissions = new Set<string>()

    for (const ur of userRoles) {
      for (const rolePermission of ur.role.rolePermissions) {
        permissions.add(rolePermission.permission.key)
      }
    }

    return Array.from(permissions)
  } catch (error) {
    console.error(`Error getting permissions for user ${userId}:`, error)
    return []
  }
}

/**
 * Assign a role to a user (with permission check on assigner)
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify assigned-by user has permission to assign
    const assignerLevel = await getUserRoleLevel(assignedBy, hotelId)
    if (assignerLevel === null) {
      return { success: false, error: 'Assigner has no roles' }
    }

    // Get target role
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!targetRole) {
      return { success: false, error: 'Role not found' }
    }

    if (targetRole.hotelId !== hotelId) {
      return { success: false, error: 'Role does not belong to this hotel' }
    }

    // Check if assigner can assign this role (higher level)
    if (!canAssignRole(assignerLevel, targetRole.level)) {
      return {
        success: false,
        error: 'Insufficient permissions to assign this role',
      }
    }

    // Check if user already has this role
    const existing = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    })

    if (existing) {
      return { success: false, error: 'User already has this role' }
    }

    // Assign role
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy,
        assignedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error(`Error assigning role to user ${userId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify role belongs to hotel
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role || role.hotelId !== hotelId) {
      return { success: false, error: 'Role not found or does not belong to this hotel' }
    }

    // Remove role
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    })

    return { success: true }
  } catch (error) {
    console.error(`Error removing role from user ${userId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a default role for a hotel
 */
export async function createDefaultRole(
  hotelId: string,
  roleKey: RoleKey
): Promise<{ success: boolean; role?: any; error?: string }> {
  try {
    // Get role definition
    const roleDef = DEFAULT_ROLES[roleKey]
    if (!roleDef) {
      return { success: false, error: `Invalid role key: ${roleKey}` }
    }

    // Check if role already exists
    const existing = await prisma.role.findUnique({
      where: {
        hotelId_key: {
          hotelId,
          key: roleKey,
        },
      },
    })

    if (existing) {
      return { success: true, role: existing }
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name: roleDef.name,
        key: roleKey,
        level: roleDef.level,
        description: roleDef.description,
        hotelId,
        rolePermissions: {
          create: roleDef.permissions.map((permKey) => ({
            permission: {
              connectOrCreate: {
                where: { key: permKey },
                create: {
                  key: permKey,
                  name: getPermission(permKey)?.name || permKey,
                  description: getPermission(permKey)?.description,
                  group: getPermission(permKey)?.group || 'system',
                  resource: getPermission(permKey)?.resource || 'system',
                  action: getPermission(permKey)?.action || 'read',
                },
              },
            },
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    return { success: true, role }
  } catch (error) {
    console.error(`Error creating default role:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create all default roles for a new hotel
 */
export async function seedDefaultRoles(hotelId: string): Promise<{
  success: boolean
  roles?: any[]
  error?: string
}> {
  try {
    const results = await Promise.all(
      Object.keys(DEFAULT_ROLES).map((key) =>
        createDefaultRole(hotelId, key as RoleKey)
      )
    )

    const failures = results.filter((r) => !r.success)
    if (failures.length > 0) {
      return {
        success: false,
        error: `Failed to create ${failures.length} roles`,
      }
    }

    const roles = results.map((r) => r.role)
    return { success: true, roles }
  } catch (error) {
    console.error(`Error seeding default roles:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
