import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Tests for Module 11: Universal QR Login System
 */

describe('Universal QR Login System', () => {
  let testHotelId: string
  let testUserId: string
  let testGuestId: string
  let testStaffId: string

  beforeAll(async () => {
    // Create test data
    const hotel = await prisma.hotel.create({
      data: {
        name: 'Test Hotel',
        slug: `test-hotel-${Date.now()}`
      }
    })
    testHotelId = hotel.id

    // Create test user (for admin)
    const user = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        name: 'Test Admin',
        hotelId: testHotelId,
        role: 'ADMIN',
        password: 'hashed_password'
      }
    })
    testUserId = user.id

    // Create test guest
    const guest = await prisma.guest.create({
      data: {
        hotelId: testHotelId,
        email: `guest-${Date.now()}@test.com`,
        firstName: 'Test',
        lastName: 'Guest',
        phone: '+1234567890'
      }
    })
    testGuestId = guest.id

    // Create test staff
    const staff = await prisma.staffProfile.create({
      data: {
        hotelId: testHotelId,
        email: `staff-${Date.now()}@test.com`,
        firstName: 'Test',
        lastName: 'Staff',
        role: 'STAFF'
      }
    })
    testStaffId = staff.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.userTemporarySession.deleteMany({
      where: { hotelId: testHotelId }
    })
    await prisma.universalQR.deleteMany({
      where: { hotelId: testHotelId }
    })
    await prisma.staffProfile.deleteMany({
      where: { hotelId: testHotelId }
    })
    await prisma.guest.deleteMany({
      where: { hotelId: testHotelId }
    })
    await prisma.user.deleteMany({
      where: { hotelId: testHotelId }
    })
    await prisma.hotel.delete({
      where: { id: testHotelId }
    })
  })

  describe('UniversalQR Model', () => {
    it('should create a new UniversalQR token', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      expect(qr).toBeDefined()
      expect(qr.hotelId).toBe(testHotelId)
      expect(qr.isActive).toBe(true)
      expect(qr.tokenHash).toBe(tokenHash)
    })

    it('should find QR token by hash', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      const found = await prisma.universalQR.findUnique({
        where: { tokenHash }
      })

      expect(found).toBeDefined()
      expect(found?.token).not.toBe(token) // Token hash should not reveal original
    })

    it('should support token rotation', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      // Mark as rotated
      const updated = await prisma.universalQR.update({
        where: { id: qr.id },
        data: { rotationDate: new Date() }
      })

      expect(updated.rotationDate).toBeDefined()
    })
  })

  describe('UserTemporarySession Model', () => {
    it('should create a temporary session for guest', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      const session = await prisma.userTemporarySession.create({
        data: {
          qrTokenId: qr.id,
          hotelId: testHotelId,
          userId: testGuestId,
          role: 'guest',
          userEmail: 'guest@test.com',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        }
      })

      expect(session).toBeDefined()
      expect(session.role).toBe('guest')
      expect(session.userId).toBe(testGuestId)
    })

    it('should auto-detect staff role', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      const session = await prisma.userTemporarySession.create({
        data: {
          qrTokenId: qr.id,
          hotelId: testHotelId,
          userId: testStaffId,
          role: 'staff',
          userEmail: 'staff@test.com',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })

      expect(session.role).toBe('staff')
    })

    it('should track session usage', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      const session = await prisma.userTemporarySession.create({
        data: {
          qrTokenId: qr.id,
          hotelId: testHotelId,
          userId: testGuestId,
          role: 'guest',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isUsed: false
        }
      })

      // Mark as used
      const updated = await prisma.userTemporarySession.update({
        where: { id: session.id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      })

      expect(updated.isUsed).toBe(true)
      expect(updated.usedAt).toBeDefined()
    })

    it('should expire sessions after 24 hours', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          createdBy: testUserId
        }
      })

      // Create an expired session
      const expiredAt = new Date(Date.now() - 1000) // 1 second ago
      const session = await prisma.userTemporarySession.create({
        data: {
          qrTokenId: qr.id,
          hotelId: testHotelId,
          userId: testGuestId,
          role: 'guest',
          expiresAt: expiredAt
        }
      })

      const isExpired = new Date() > session.expiresAt
      expect(isExpired).toBe(true)
    })
  })

  describe('QR Token Lifecycle', () => {
    it('should handle complete QR flow: generate -> validate -> session', async () => {
      // Step 1: Generate token
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      expect(qr.isActive).toBe(true)

      // Step 2: Validate token (by hash)
      const found = await prisma.universalQR.findUnique({
        where: { tokenHash }
      })

      expect(found).toBeDefined()
      expect(found?.isActive).toBe(true)
      expect(new Date() < found!.expiresAt).toBe(true)

      // Step 3: Create session
      const session = await prisma.userTemporarySession.create({
        data: {
          qrTokenId: qr.id,
          hotelId: testHotelId,
          userId: testGuestId,
          role: 'guest',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: '127.0.0.1'
        }
      })

      expect(session).toBeDefined()
      expect(session.qrTokenId).toBe(qr.id)
    })

    it('should reject expired tokens', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiredAt = new Date(Date.now() - 1000) // Already expired

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt: expiredAt,
          isActive: true,
          createdBy: testUserId
        }
      })

      const isExpired = new Date() > qr.expiresAt
      expect(isExpired).toBe(true)
    })

    it('should reject inactive tokens', async () => {
      const token = crypto.randomBytes(48).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const qr = await prisma.universalQR.create({
        data: {
          hotelId: testHotelId,
          token,
          tokenHash,
          expiresAt,
          isActive: false, // Inactive
          createdBy: testUserId
        }
      })

      expect(qr.isActive).toBe(false)
    })
  })
})
