import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  checkPermission,
  checkRole,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserPermissions
} from '@/lib/services/rbac/rbacService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    userRole: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn()
    },
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    rolePermission: {
      findMany: vi.fn()
    },
    permission: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

describe('RBAC Service', () => {
  const testUserId = 'user-123'
  const testHotelId = 'hotel-456'
  const testRoleId = 'role-admin'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkPermission', () => {
    it('should return true if user has permission', async () => {
      const mockUserRole = {
        role: {
          rolePermissions: [
            {
              permission: {
                key: 'pms:read'
              }
            }
          ]
        }
      }

      vi.mocked(prisma.userRole.findFirst).mockResolvedValueOnce(mockUserRole as any)

      const result = await checkPermission(testUserId, testHotelId, 'pms:read')
      expect(result).toBe(true)
    })

    it('should return false if user lacks permission', async () => {
      vi.mocked(prisma.userRole.findFirst).mockResolvedValueOnce(null)

      const result = await checkPermission(testUserId, testHotelId, 'admin:access')
      expect(result).toBe(false)
    })

    it('should handle non-existent users gracefully', async () => {
      vi.mocked(prisma.userRole.findFirst).mockResolvedValueOnce(null)

      const result = await checkPermission('non-existent-user', testHotelId, 'pms:read')
      expect(result).toBe(false)
    })
  })

  describe('checkRole', () => {
    it('should return true if user has specified role', async () => {
      const mockUserRole = {
        role: { key: 'admin' }
      }

      vi.mocked(prisma.userRole.findFirst).mockResolvedValueOnce(mockUserRole as any)

      const result = await checkRole(testUserId, testHotelId, 'admin')
      expect(result).toBe(true)
    })

    it('should return false if user lacks role', async () => {
      vi.mocked(prisma.userRole.findFirst).mockResolvedValueOnce(null)

      const result = await checkRole(testUserId, testHotelId, 'manager')
      expect(result).toBe(false)
    })
  })

  describe('assignRoleToUser', () => {
    it('should assign role and create audit entry', async () => {
      const mockRole = { id: testRoleId, key: 'manager', hotelId: testHotelId }
      
      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockRole as any)
      vi.mocked(prisma.userRole.create).mockResolvedValueOnce({
        userId: testUserId,
        roleId: testRoleId,
        assignedBy: 'admin-user',
        assignedAt: new Date()
      } as any)

      const result = await assignRoleToUser(
        testUserId,
        testHotelId,
        'manager',
        'admin-user'
      )

      expect(result).toBe(true)
      expect(prisma.userRole.create).toHaveBeenCalled()
    })

    it('should not assign invalid role', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null)

      const result = await assignRoleToUser(
        testUserId,
        testHotelId,
        'invalid-role',
        'admin-user'
      )

      expect(result).toBe(false)
    })
  })

  describe('removeRoleFromUser', () => {
    it('should remove role from user', async () => {
      vi.mocked(prisma.userRole.delete).mockResolvedValueOnce({} as any)

      const result = await removeRoleFromUser(testUserId, testHotelId, 'manager')

      expect(result).toBe(true)
      expect(prisma.userRole.delete).toHaveBeenCalled()
    })
  })

  describe('getUserRoles', () => {
    it('should return array of user roles', async () => {
      const mockRoles = [
        { role: { id: 'role-1', key: 'admin', name: 'Admin' } },
        { role: { id: 'role-2', key: 'manager', name: 'Manager' } }
      ]

      vi.mocked(prisma.userRole.findMany).mockResolvedValueOnce(mockRoles as any)

      const result = await getUserRoles(testUserId, testHotelId)

      expect(result).toHaveLength(2)
      expect(result).toContain('admin')
      expect(result).toContain('manager')
    })

    it('should return empty array if user has no roles', async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValueOnce([])

      const result = await getUserRoles(testUserId, testHotelId)

      expect(result).toEqual([])
    })
  })

  describe('getUserPermissions', () => {
    it('should return array of user permissions', async () => {
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              { permission: { key: 'pms:read' } },
              { permission: { key: 'pms:bookings.create' } }
            ]
          }
        }
      ]

      vi.mocked(prisma.userRole.findMany).mockResolvedValueOnce(mockUserRoles as any)

      const result = await getUserPermissions(testUserId, testHotelId)

      expect(result).toContain('pms:read')
      expect(result).toContain('pms:bookings.create')
    })

    it('should return empty array if user has no permissions', async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValueOnce([])

      const result = await getUserPermissions(testUserId, testHotelId)

      expect(result).toEqual([])
    })
  })
})
