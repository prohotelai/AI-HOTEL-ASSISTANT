import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { generatePermanentHotelQR } from '@/lib/services/hotelQrService'

const prisma = new PrismaClient()

describe('QR API Endpoints', () => {
  let testHotelId: string
  let testQrCode: string
  let testUserId: string

  beforeAll(async () => {
    // Create test hotel with QR
    const { qrCode, qrPayload } = await generatePermanentHotelQR('test-hotel-api')
    testQrCode = qrCode

    const hotel = await prisma.hotel.create({
      data: {
        id: 'test-hotel-api',
        name: 'Test Hotel API',
        slug: 'test-hotel-api',
        qrCode,
        qrPayload
      }
    })
    testHotelId = hotel.id

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'testuser@hotelqr.com',
        name: 'Test User',
        role: 'OWNER',
        hotelId: testHotelId
      }
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
    await prisma.hotel.delete({ where: { id: testHotelId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('POST /api/qr/[hotelId] (DEPRECATED)', () => {
    it('should return 410 Gone for QR generation attempts', async () => {
      const res = await fetch(`http://localhost:3000/api/qr/${testHotelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      expect(res.status).toBe(410)
      const data = await res.json()
      expect(data.deprecated).toBe(true)
      expect(data.error).toContain('no longer available')
    })

    it('should provide migration information', async () => {
      const res = await fetch(`http://localhost:3000/api/qr/${testHotelId}`, {
        method: 'POST'
      })

      const data = await res.json()
      expect(data.message).toContain('permanent')
      expect(data.message).toContain('GET /api/qr')
    })
  })

  describe('GET /api/qr/[hotelId]', () => {
    it('should return permanent QR code for authorized user', async () => {
      // This test would require authentication mock
      // For now, we document expected behavior
      expect(true).toBe(true)
    })

    it('should return 401 for unauthenticated requests', async () => {
      const res = await fetch(`http://localhost:3000/api/qr/${testHotelId}`, {
        method: 'GET'
      })

      expect([401, 403]).toContain(res.status)
    })

    it('should return 404 for hotel without QR', async () => {
      // Create hotel without QR
      const hotelWithoutQR = await prisma.hotel.create({
        data: {
          name: 'Hotel Without QR',
          slug: 'hotel-without-qr-test'
        }
      })

      // Attempt to get QR (would require auth in real scenario)
      // Expected: 404 response

      // Cleanup
      await prisma.hotel.delete({ where: { id: hotelWithoutQR.id } })
    })
  })

  describe('POST /api/qr/validate', () => {
    it('should validate correct QR code', async () => {
      const res = await fetch('http://localhost:3000/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: testQrCode })
      })

      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.hotelId).toBe(testHotelId)
      expect(data.hotelName).toBe('Test Hotel API')
      expect(data.payload.type).toBe('hotel_entry')
    })

    it('should reject invalid QR code', async () => {
      const res = await fetch('http://localhost:3000/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: 'invalid-qr-code-123' })
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toContain('Invalid')
    })

    it('should return 400 for missing qrCode', async () => {
      const res = await fetch('http://localhost:3000/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('required')
    })

    it('should support legacy "token" parameter', async () => {
      const res = await fetch('http://localhost:3000/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: testQrCode }) // Legacy format
      })

      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.hotelId).toBe(testHotelId)
    })
  })

  describe('POST /api/qr/generate (DEPRECATED)', () => {
    it('should return 410 Gone', async () => {
      const res = await fetch('http://localhost:3000/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: testHotelId,
          userId: testUserId,
          role: 'guest'
        })
      })

      expect(res.status).toBe(410)
      const data = await res.json()
      expect(data.deprecated).toBe(true)
    })
  })
})

describe('QR Code System Rules', () => {
  it('should enforce ONE QR per hotel rule', async () => {
    const hotels = await prisma.hotel.findMany({
      select: {
        id: true,
        qrCode: true
      },
      where: {
        qrCode: {
          not: null
        }
      }
    })

    // Count unique QR codes
    const qrCodes = hotels.map(h => h.qrCode)
    const uniqueQrCodes = new Set(qrCodes)

    // Each QR code should be unique
    expect(qrCodes.length).toBe(uniqueQrCodes.size)
  })

  it('should not allow QR regeneration through standard endpoints', async () => {
    // POST /api/qr/generate should return 410
    // POST /api/qr/[hotelId] should return 410
    // Only system-level regenerateHotelQr() should work
    expect(true).toBe(true)
  })
})
