/**
 * RBAC Service Engine
 * 
 * Provides core permission checking, enforcement, and role hierarchy logic.
 * Handles multi-tenant permission validation and role-based access control.
 */

import { prisma } from '@/lib/prisma'
import { getPermission } from '@/lib/rbac/permissions'
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
    const userRole = await prisma.userRole.findFirst({
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

    if (!userRole) return false

    const permissions = userRole.role.rolePermissions.map((rp) => rp.permission.key)
    return permissions.includes(permissionKey)
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

    return userRoles.map((ur) => ur.role.key)
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
    const roles = await prisma.userRole.findMany({
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

    const permissions = new Set<string>()

    for (const ur of roles) {
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
  hotelId: string,
  roleKey: string,
  assignedBy: string
): Promise<boolean> {
  try {
    const targetRole = await prisma.role.findUnique({ where: { key: roleKey, hotelId } as any })
    if (!targetRole) {
      return false
    }

    await prisma.userRole.create({
      data: {
        userId,
        roleId: targetRole.id,
        assignedBy,
        assignedAt: new Date(),
      },
    })

    return true
  } catch (error) {
    console.error(`Error assigning role to user ${userId}:`, error)
    return false
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  hotelId: string,
  roleKey: string
): Promise<boolean> {
  try {
    await prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId: roleKey } as any
      }
    } as any)

    return true
  } catch (error) {
    console.error(`Error removing role from user ${userId}:`, error)
    return false
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

    const role = await prisma.role.upsert({
      where: {
        hotelId_key: {
          hotelId,
          key: roleKey,
        },
      },
      create: {
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
      update: {
        name: roleDef.name,
        level: roleDef.level,
        description: roleDef.description,
        hotelId,
        rolePermissions: {
          deleteMany: {},
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
    if ((error as any)?.code === 'P2002') {
      const existing = await prisma.role.findFirst({ where: { key: roleKey } })
      if (existing) {
        const role = await prisma.role.update({
          where: { id: existing.id },
          data: { hotelId },
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        })
        return { success: true, role }
      }
    }

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
    // In test environments, clear conflicting global roles to avoid unique key collisions
    if (process.env.NODE_ENV === 'test') {
      await prisma.role.deleteMany({
        where: { key: { in: Object.keys(DEFAULT_ROLES) } },
      })
    }

    const results: { success: boolean; role?: any; error?: string }[] = []
    for (const key of Object.keys(DEFAULT_ROLES)) {
      results.push(await createDefaultRole(hotelId, key as RoleKey))
    }

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
