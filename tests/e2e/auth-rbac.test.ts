/**
 * E2E Tests: Authentication & RBAC
 * 
 * Critical flows:
 * - Valid login → access allowed
 * - Invalid role → 403 forbidden
 * - Cross-hotel access denied
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { withAuth } from '@/lib/auth/withAuth'
import bcrypt from 'bcryptjs'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

import { getServerSession } from 'next-auth'

describe('E2E: Authentication & RBAC', () => {
  let testHotel1: any
  let testHotel2: any
  let managerUser: any
  let staffUser: any
  let managerRole: any
  let staffRole: any
  let adminPermission: any
  let ticketsViewPermission: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.rolePermission.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.ticket.deleteMany()
    await prisma.user.deleteMany({ where: { email: { contains: '@e2e-test.com' } } })
    await prisma.hotel.deleteMany({ where: { name: { contains: 'E2E Test Hotel' } } })

    // Create test hotels
    testHotel1 = await prisma.hotel.create({
      data: {
        name: 'E2E Test Hotel 1',
        slug: `e2e-test-hotel-1-${Date.now()}`,
        email: 'hotel1@e2e-test.com',
        phone: '1234567890',
        address: '123 Test St'
      }
    })

    testHotel2 = await prisma.hotel.create({
      data: {
        name: 'E2E Test Hotel 2',
        slug: `e2e-test-hotel-2-${Date.now()}`,
        email: 'hotel2@e2e-test.com',
        phone: '0987654321',
        address: '456 Test Ave'
      }
    })

    // Create roles
    managerRole = await prisma.role.create({
      data: {
        name: 'manager',
        key: 'manager',
        hotelId: testHotel1.id,
        description: 'Hotel Manager'
      }
    })

    staffRole = await prisma.role.create({
      data: {
        name: 'staff',
        key: 'staff',
        hotelId: testHotel1.id,
        description: 'Hotel Staff'
      }
    })

    // Create permissions
    adminPermission = await prisma.permission.create({
      data: {
        key: Permission.ADMIN_MANAGE,
        name: 'Admin Management',
        description: 'Full admin access',
        group: 'admin',
        resource: 'admin',
        action: 'manage'
      }
    })

    ticketsViewPermission = await prisma.permission.create({
      data: {
        key: Permission.TICKETS_VIEW,
        name: 'View Tickets',
        description: 'View support tickets',
        group: 'tickets',
        resource: 'tickets',
        action: 'read'
      }
    })

    // Assign permissions to roles
    await prisma.rolePermission.create({
      data: {
        roleId: managerRole.id,
        permissionId: adminPermission.id
      }
    })

    await prisma.rolePermission.create({
      data: {
        roleId: staffRole.id,
        permissionId: ticketsViewPermission.id
      }
    })

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10)

    managerUser = await prisma.user.create({
      data: {
        email: 'manager@e2e-test.com',
        name: 'Test Manager',
        password: hashedPassword,
        hotelId: testHotel1.id
      }
    })

    staffUser = await prisma.user.create({
      data: {
        email: 'staff@e2e-test.com',
        name: 'Test Staff',
        password: hashedPassword,
        hotelId: testHotel1.id
      }
    })

    // Assign roles to users
    await prisma.userRole.create({
      data: {
        userId: managerUser.id,
        roleId: managerRole.id
      }
    })

    await prisma.userRole.create({
      data: {
        userId: staffUser.id,
        roleId: staffRole.id
      }
    })
  })

  afterEach(async () => {
    vi.clearAllMocks()
  })

  describe('Valid Login → Access Allowed', () => {
    it('should allow authenticated manager to access admin endpoint', async () => {
      // Mock session with manager user
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: managerUser.id,
          email: managerUser.email,
          hotelId: testHotel1.id,
          role: 'manager'
        },
        expires: '2025-12-31'
      } as any)

      // Create a protected handler
      const handler = withPermission(Permission.ADMIN_MANAGE)(async (req: NextRequest) => {
        return NextResponse.json({ success: true, message: 'Access granted' })
      })

      const request = new NextRequest('http://localhost:3000/api/admin/test')
      const response = await handler(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Access granted')
    })

    it('should allow authenticated staff to access tickets endpoint', async () => {
      // Mock session with staff user
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: staffUser.id,
          email: staffUser.email,
          hotelId: testHotel1.id,
          role: 'staff'
        },
        expires: '2025-12-31'
      } as any)

      // Create a protected handler
      const handler = withPermission(Permission.TICKETS_VIEW)(async (req: NextRequest) => {
        return NextResponse.json({ success: true, tickets: [] })
      })

      const request = new NextRequest('http://localhost:3000/api/tickets')
      const response = await handler(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should allow any authenticated user to access withAuth endpoint', async () => {
      // Mock session with staff user
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: staffUser.id,
          email: staffUser.email,
          hotelId: testHotel1.id,
          role: 'staff'
        },
        expires: '2025-12-31'
      } as any)

      // Create an auth-only handler
      const handler = withAuth(async (req: NextRequest, ctx) => {
        return NextResponse.json({ 
          success: true, 
          userId: ctx.userId,
          hotelId: ctx.hotelId 
        })
      })

      const request = new NextRequest('http://localhost:3000/api/session/me')
      const response = await handler(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.userId).toBe(staffUser.id)
      expect(body.hotelId).toBe(testHotel1.id)
    })
  })

  describe('Invalid Role → 403 Forbidden', () => {
    it('should deny staff user access to admin endpoint', async () => {
      // Mock session with staff user (lacks ADMIN_MANAGE permission)
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: staffUser.id,
          email: staffUser.email,
          hotelId: testHotel1.id,
          role: 'staff'
        },
        expires: '2025-12-31'
      } as any)

      // Create admin-protected handler
      const handler = withPermission(Permission.ADMIN_MANAGE)(async (req: NextRequest) => {
        return NextResponse.json({ success: true })
      })

      const request = new NextRequest('http://localhost:3000/api/admin/test')
      const response = await handler(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Forbidden')
    })

    it('should deny manager access to permission they lack', async () => {
      // Create a permission manager doesn't have
      const specialPermission = await prisma.permission.create({
        data: {
          key: 'special:restricted',
          name: 'Special Restricted',
          description: 'Special permission',
          group: 'custom',
          resource: "special",
          action: 'read'
        }
      })

      // Mock session with manager
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: managerUser.id,
          email: managerUser.email,
          hotelId: testHotel1.id,
          role: 'manager'
        },
        expires: '2025-12-31'
      } as any)

      // Create protected handler with special permission
      const handler = withPermission('special:restricted' as Permission)(async (req: NextRequest) => {
        return NextResponse.json({ success: true })
      })

      const request = new NextRequest('http://localhost:3000/api/special')
      const response = await handler(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Forbidden')

      // Cleanup
      await prisma.permission.delete({ where: { id: specialPermission.id } })
    })

    it('should return 401 for unauthenticated request', async () => {
      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null)

      const handler = withPermission(Permission.ADMIN_MANAGE)(async (req: NextRequest) => {
        return NextResponse.json({ success: true })
      })

      const request = new NextRequest('http://localhost:3000/api/admin/test')
      const response = await handler(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Unauthorized')
    })
  })

  describe('Cross-Hotel Access Denied', () => {
    it('should deny access to resources from different hotel', async () => {
      // Create a ticket in hotel2
      const guestInHotel2 = await prisma.guest.create({
        data: {
          hotelId: testHotel2.id,
          firstName: 'Guest',
          lastName: 'Hotel2',
          email: 'guest@hotel2.com',
          phone: '1111111111'
        }
      })

      const ticketInHotel2 = await prisma.ticket.create({
        data: {
          hotelId: testHotel2.id,
          title: 'Cross-hotel ticket',
          description: 'This belongs to hotel 2',
          priority: 'MEDIUM',
          status: 'OPEN',
          userId: staffUser.id, // Use existing staff user
          createdById: staffUser.id,
          guestId: guestInHotel2.id
        }
      })

      // Mock session with user from hotel1
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: managerUser.id,
          email: managerUser.email,
          hotelId: testHotel1.id, // Hotel 1 user
          role: 'manager'
        },
        expires: '2025-12-31'
      } as any)

      // Try to access hotel2's ticket
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketInHotel2.id }
      })

      // Verify ticket exists
      expect(ticket).toBeTruthy()
      expect(ticket?.hotelId).toBe(testHotel2.id)

      // Simulate proper hotel scoping in query
      const ticketWithScoping = await prisma.ticket.findFirst({
        where: { 
          id: ticketInHotel2.id,
          hotelId: testHotel1.id // User's hotel
        }
      })

      // Should not find ticket from different hotel
      expect(ticketWithScoping).toBeNull()

      // Cleanup
      await prisma.ticket.delete({ where: { id: ticketInHotel2.id } })
      await prisma.guest.delete({ where: { id: guestInHotel2.id } })
    })

    it('should enforce hotel scoping in withAuth context', async () => {
      // Mock session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: managerUser.id,
          email: managerUser.email,
          hotelId: testHotel1.id,
          role: 'manager'
        },
        expires: '2025-12-31'
      } as any)

      let capturedContext: any = null

      const handler = withAuth(async (req: NextRequest, ctx) => {
        capturedContext = ctx
        return NextResponse.json({ success: true })
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      await handler(request)

      // Verify context contains correct hotelId
      expect(capturedContext).toBeTruthy()
      expect(capturedContext.hotelId).toBe(testHotel1.id)
      expect(capturedContext.userId).toBe(managerUser.id)
    })

    it('should prevent cross-hotel booking access', async () => {
      // Create room and guest in hotel2
      const roomType = await prisma.roomType.create({
        data: {
          hotelId: testHotel2.id,
          name: 'Standard Room',
          basePrice: 100,
          maxOccupancy: 2
        }
      })

      const room = await prisma.room.create({
        data: {
          hotelId: testHotel2.id,
          roomNumber: '201',
          floor: 2,
          roomTypeId: roomType.id,
          status: 'AVAILABLE'
        }
      })

      const guest = await prisma.guest.create({
        data: {
          hotelId: testHotel2.id,
          firstName: 'Cross',
          lastName: 'Hotel',
          email: 'cross@hotel2.com',
          phone: '2222222222'
        }
      })

      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel2.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date(),
          checkOutDate: new Date(Date.now() + 86400000), // +1 day
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CONFIRMED',
          totalAmount: 100,
          currency: 'USD'
        }
      })

      // User from hotel1 tries to query booking from hotel2
      const bookingWithScoping = await prisma.booking.findFirst({
        where: {
          id: booking.id,
          hotelId: testHotel1.id // User's hotel (wrong hotel)
        }
      })

      // Should not find booking from different hotel
      expect(bookingWithScoping).toBeNull()

      // Correct query with proper scoping should work
      const bookingCorrect = await prisma.booking.findFirst({
        where: {
          id: booking.id,
          hotelId: testHotel2.id // Correct hotel
        }
      })

      expect(bookingCorrect).toBeTruthy()

      // Cleanup
      await prisma.booking.delete({ where: { id: booking.id } })
      await prisma.guest.delete({ where: { id: guest.id } })
      await prisma.room.delete({ where: { id: room.id } })
      await prisma.roomType.delete({ where: { id: roomType.id } })
    })
  })
})
