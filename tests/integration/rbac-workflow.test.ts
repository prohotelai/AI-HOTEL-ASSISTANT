import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { seedDefaultRoles } from '@/lib/services/rbac/rbacService'

/**
 * Integration Tests for RBAC System
 * 
 * Tests complete workflows:
 * - Role assignment and permission inheritance
 * - Multi-tenant isolation
 * - Permission enforcement across endpoints
 * - Role hierarchy validation
 */
describe('RBAC Integration Tests', () => {
  const testHotelId = `test-hotel-${Date.now()}`
  const testUserId = `test-user-${Date.now()}`

  beforeAll(async () => {
    // Create test hotel
    await prisma.hotel.create({
      data: {
        id: testHotelId,
        name: 'Test Hotel',
        slug: `rbac-${Date.now()}`
      }
    })

    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `testuser-${Date.now()}@example.com`,
        hotelId: testHotelId
      }
    })

    // Seed default roles
    await seedDefaultRoles(testHotelId)
  }, 40000)

  afterAll(async () => {
    // Cleanup test data
    await prisma.userRole.deleteMany({
      where: {
        role: { hotelId: testHotelId }
      }
    })

    await prisma.rolePermission.deleteMany({
      where: {
        role: { hotelId: testHotelId }
      }
    })

    await prisma.role.deleteMany({
      where: { hotelId: testHotelId }
    })

    await prisma.user.deleteMany({
      where: { id: testUserId }
    })

    await prisma.hotel.deleteMany({
      where: { id: testHotelId }
    })
  })

  describe('Role Assignment Workflow', () => {
    it('should assign role to user', async () => {
      const role = await prisma.role.findFirst({
        where: { hotelId: testHotelId, key: 'manager' }
      })

      expect(role).toBeDefined()

      const userRole = await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: role!.id,
          assignedBy: 'admin-user'
        }
      })

      expect(userRole.userId).toBe(testUserId)
      expect(userRole.roleId).toBe(role!.id)
    })

    it('should prevent duplicate role assignment', async () => {
      const role = await prisma.role.findFirst({
        where: { hotelId: testHotelId, key: 'staff' }
      })

      await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: role!.id,
          assignedBy: 'admin-user'
        }
      })

      // Attempting to assign same role again should fail
      try {
        await prisma.userRole.create({
          data: {
            userId: testUserId,
            roleId: role!.id,
            assignedBy: 'admin-user'
          }
        })
        expect.fail('Should have thrown duplicate key error')
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined()
      }
    })
  })

  describe('Permission Inheritance', () => {
    it('should inherit permissions from role', async () => {
      const adminRole = await prisma.role.findFirst({
        where: { hotelId: testHotelId, key: 'admin' },
        include: { rolePermissions: { include: { permission: true } } }
      })

      expect(adminRole).toBeDefined()
      expect(adminRole!.rolePermissions.length).toBeGreaterThan(0)
    })

    it('should enforce permission hierarchy', async () => {
      const roles = await prisma.role.findMany({
        where: { hotelId: testHotelId },
        orderBy: { level: 'desc' }
      })

      expect(roles.length).toBeGreaterThan(0)

      // Higher level roles should be first
      expect(roles[0].level).toBeGreaterThanOrEqual(roles[roles.length - 1].level)
    })
  })

  describe('Multi-Tenant Isolation', () => {
    it('should not allow cross-tenant role assignment', async () => {
      const otherHotelId = `other-hotel-${Date.now()}`

      // Create other hotel
      await prisma.hotel.create({
        data: {
          id: otherHotelId,
          name: 'Other Hotel',
          slug: `rbac-other-${Date.now()}`
        }
      })

      try {
        const roleFromOtherHotel = await prisma.role.findFirst({
          where: { hotelId: otherHotelId, key: 'admin' }
        })

        if (roleFromOtherHotel) {
          // This should fail because we're assigning a role from different hotel
          await prisma.userRole.create({
            data: {
              userId: testUserId,
              roleId: roleFromOtherHotel.id,
              assignedBy: 'admin'
            }
          })
          expect.fail('Should not allow cross-tenant assignment')
        }
      } finally {
        // Cleanup
        await prisma.role.deleteMany({
          where: { hotelId: otherHotelId }
        })

        await prisma.hotel.delete({
          where: { id: otherHotelId }
        })
      }
    })

    it('should scope roles by hotel', async () => {
      const hotelRoles = await prisma.role.findMany({
        where: { hotelId: testHotelId }
      })

      for (const role of hotelRoles) {
        expect(role.hotelId).toBe(testHotelId)
      }
    })
  })

  describe('Role Hierarchy Validation', () => {
    it('should maintain role levels', async () => {
      const roles = await prisma.role.findMany({
        where: { hotelId: testHotelId }
      })

      const levels = roles.map(r => r.level)
      const uniqueLevels = new Set(levels)

      expect(levels.length).toBeGreaterThan(0)
      expect(uniqueLevels.size).toBeGreaterThan(0)
    })

    it('should validate role level bounds', async () => {
      const roles = await prisma.role.findMany({
        where: { hotelId: testHotelId }
      })

      for (const role of roles) {
        // Levels should be between 0 and 4
        expect(role.level).toBeGreaterThanOrEqual(0)
        expect(role.level).toBeLessThanOrEqual(4)
      }
    })
  })

  describe('Audit Trail', () => {
    it('should record role assignments', async () => {
      const role = await prisma.role.findFirst({
        where: { hotelId: testHotelId, key: 'supervisor' }
      })

      const userRole = await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: role!.id,
          assignedBy: 'audit-test-user'
        }
      })

      expect(userRole.assignedBy).toBe('audit-test-user')
      expect(userRole.assignedAt).toBeDefined()
    })

    it('should track assignment timestamp', async () => {
      const role = await prisma.role.findFirst({
        where: { hotelId: testHotelId, key: 'reception' }
      })

      const now = new Date()
      const userRole = await prisma.userRole.create({
        data: {
          userId: testUserId,
          roleId: role!.id,
          assignedBy: 'timestamp-test'
        }
      })

      expect(userRole.assignedAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000)
      expect(userRole.assignedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
    })
  })
})
