/**
 * وسيط RBAC - التحقق من الصلاحيات
 * RBAC Middleware - Permission Verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Permission } from '@/lib/rbac'
import { SystemRole } from '@/lib/types/roles'

/**
 * التحقق من صلاحية المستخدم
 */
export async function hasPermission(
  userId: string,
  permission: Permission,
  hotelId: string
): Promise<boolean> {
  try {
    // جلب المستخدم مع أدواره
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user || user.hotelId !== hotelId) {
      return false
    }

    if (user.isSuspended) {
      return false
    }

    // المالك لديه جميع الصلاحيات
    if ((user.role || '').toUpperCase() === SystemRole.OWNER) {
      return true
    }

    // التحقق من الصلاحيات عبر الأدوار
    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.key === permission) {
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

/**
 * وسيط للتحقق من الصلاحية
 * Middleware to check permission
 */
export function withPermission(permission: Permission) {
  return function (handler: (req: NextRequest, context?: any) => Promise<Response>) {
    return async function (req: NextRequest, context?: any): Promise<Response> {
      try {
        // الحصول على الجلسة
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Please login', message: 'Unauthorized - Please login' },
            { status: 401 }
          )
        }

        const user = session.user as any

        // التحقق من hotelId
        if (!user.hotelId) {
          return NextResponse.json(
            { error: 'Unauthorized - No hotel associated', message: 'Unauthorized - No hotel associated' },
            { status: 403 }
          )
        }

        if (user.isSuspended) {
          return NextResponse.json(
            {
              error: 'Account suspended - access temporarily disabled',
              message: 'Account suspended - access temporarily disabled'
            },
            { status: 403 }
          )
        }

        // التحقق من الصلاحية
        const hasAccess = await hasPermission(user.id, permission, user.hotelId)

        if (!hasAccess) {
          return NextResponse.json(
            { 
              error: 'Forbidden - You do not have permission to access this resource', 
              message: 'Forbidden - You do not have permission to access this resource',
              requiredPermission: permission
            },
            { status: 403 }
          )
        }

        // تنفيذ المعالج
        return await handler(req, context)
      } catch (error) {
        console.error('Permission middleware error:', error)
        return NextResponse.json(
          { error: 'خطأ في الخادم', message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * وسيط للتحقق من أي صلاحية من قائمة
 * Middleware to check any permission from a list
 */
export function withAnyPermission(permissions: Permission[]) {
  return function (handler: (req: NextRequest, context?: any) => Promise<Response>) {
    return async function (req: NextRequest, context?: any): Promise<Response> {
      try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Please login', message: 'Unauthorized - Please login' },
            { status: 401 }
          )
        }

        const user = session.user as any

        if (!user.hotelId) {
          return NextResponse.json(
            { error: 'Unauthorized - No hotel associated', message: 'Unauthorized - No hotel associated' },
            { status: 403 }
          )
        }

        if (user.isSuspended) {
          return NextResponse.json(
            {
              error: 'Account suspended - access temporarily disabled',
              message: 'Account suspended - access temporarily disabled'
            },
            { status: 403 }
          )
        }

        // التحقق من أي صلاحية
        let hasAccess = false
        for (const permission of permissions) {
          if (await hasPermission(user.id, permission, user.hotelId)) {
            hasAccess = true
            break
          }
        }

        if (!hasAccess) {
          return NextResponse.json(
            { 
              error: 'Forbidden - You do not have any of the required permissions', 
              message: 'Forbidden - You do not have any of the required permissions',
              requiredPermissions: permissions
            },
            { status: 403 }
          )
        }

        return await handler(req, context)
      } catch (error) {
        console.error('Any permission middleware error:', error)
        return NextResponse.json(
          { error: 'خطأ في الخادم', message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * وسيط للتحقق من الدور
 * Middleware to check role
 */
export function withRole(roles: string[]) {
  return function (handler: (req: NextRequest, context?: any) => Promise<Response>) {
    return async function (req: NextRequest, context?: any): Promise<Response> {
      try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Please login', message: 'Unauthorized - Please login' },
            { status: 401 }
          )
        }

        const user = session.user as any

        if (!roles.includes(user.role)) {
          return NextResponse.json(
            { 
              error: 'Forbidden - You do not have the required role', 
              message: 'Forbidden - You do not have the required role',
              requiredRoles: roles,
              yourRole: user.role
            },
            { status: 403 }
          )
        }

        if (user.isSuspended) {
          return NextResponse.json(
            {
              error: 'تم تعليق الحساب',
              message: 'Account suspended - access temporarily disabled'
            },
            { status: 403 }
          )
        }

        return await handler(req, context)
      } catch (error) {
        console.error('Role middleware error:', error)
        return NextResponse.json(
          { error: 'خطأ في الخادم', message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * وسيط للتحقق من المصادقة فقط (بدون صلاحيات)
 * Middleware to check authentication only (no permissions)
 */
export function withAuth(handler: (req: NextRequest, context?: any) => Promise<Response>) {
  return async function (req: NextRequest, context?: any): Promise<Response> {
    try {
      const session = await getServerSession(authOptions)

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'غير مصرح - يجب تسجيل الدخول', message: 'Unauthorized - Please login' },
          { status: 401 }
        )
      }

      const user = session.user as any

      if (user.isSuspended) {
        return NextResponse.json(
          {
            error: 'تم تعليق الحساب',
            message: 'Account suspended - access temporarily disabled'
          },
          { status: 403 }
        )
      }

      return await handler(req, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'خطأ في الخادم', message: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * التحقق من صلاحيات المستخدم الحالي
 */
export async function getCurrentUserPermissions(userId: string, hotelId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user || user.hotelId !== hotelId) {
      return []
    }

    if (user.isSuspended) {
      return []
    }

    // المالك لديه جميع الصلاحيات
    if (user.role === SystemRole.OWNER) {
      return Object.values(Permission)
    }

    // جمع جميع الصلاحيات
    const permissions = new Set<string>()
    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.key)
      }
    }

    return Array.from(permissions)
  } catch (error) {
    console.error('Get user permissions error:', error)
    return []
  }
}
