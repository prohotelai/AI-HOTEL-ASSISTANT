import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getHotelQr, validateHotelQr, hotelHasQr, generatePermanentHotelQR } from '@/lib/services/hotelQrService'

const prisma = new PrismaClient()

describe('Hotel QR Service - Permanent QR System', () => {
  let testHotelId: string

  beforeAll(async () => {
    // Create test hotel with QR
    const { qrCode, qrPayload } = await generatePermanentHotelQR('test-hotel-id')
    
    const hotel = await prisma.hotel.create({
      data: {
        id: 'test-hotel-id',
        name: 'Test Hotel',
        slug: 'test-hotel',
        qrCode,
        qrPayload
      }
    })
    testHotelId = hotel.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.hotel.delete({ where: { id: testHotelId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('getHotelQr', () => {
    it('should return QR data for existing hotel', async () => {
      const result = await getHotelQr(testHotelId)

      expect(result).not.toBeNull()
      expect(result?.qrCode).toBeDefined()
      expect(result?.qrPayload).toBeDefined()
      expect(result?.qrPayload.hotelId).toBe(testHotelId)
      expect(result?.qrPayload.type).toBe('hotel_entry')
      expect(result?.qrUrl).toContain(result!.qrCode)
      expect(result?.hotelName).toBe('Test Hotel')
    })

    it('should return null for non-existent hotel', async () => {
      const result = await getHotelQr('non-existent-hotel-id')
      expect(result).toBeNull()
    })

    it('should return null for hotel without QR', async () => {
      // Create hotel without QR
      const hotelWithoutQR = await prisma.hotel.create({
        data: {
          name: 'Hotel Without QR',
          slug: 'hotel-without-qr'
        }
      })

      const result = await getHotelQr(hotelWithoutQR.id)
      expect(result).toBeNull()

      // Cleanup
      await prisma.hotel.delete({ where: { id: hotelWithoutQR.id } })
    })
  })

  describe('validateHotelQr', () => {
    it('should validate correct QR code', async () => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: testHotelId },
        select: { qrCode: true }
      })

      const result = await validateHotelQr(hotel!.qrCode!)

      expect(result).not.toBeNull()
      expect(result?.hotelId).toBe(testHotelId)
      expect(result?.hotelName).toBe('Test Hotel')
      expect(result?.payload.type).toBe('hotel_entry')
    })

    it('should return null for invalid QR code', async () => {
      const result = await validateHotelQr('invalid-qr-code-123')
      expect(result).toBeNull()
    })

    it('should return null for empty QR code', async () => {
      const result = await validateHotelQr('')
      expect(result).toBeNull()
    })
  })

  describe('hotelHasQr', () => {
    it('should return true for hotel with QR', async () => {
      const result = await hotelHasQr(testHotelId)
      expect(result).toBe(true)
    })

    it('should return false for hotel without QR', async () => {
      const hotelWithoutQR = await prisma.hotel.create({
        data: {
          name: 'Another Hotel Without QR',
          slug: 'another-hotel-without-qr'
        }
      })

      const result = await hotelHasQr(hotelWithoutQR.id)
      expect(result).toBe(false)

      // Cleanup
      await prisma.hotel.delete({ where: { id: hotelWithoutQR.id } })
    })

    it('should return false for non-existent hotel', async () => {
      const result = await hotelHasQr('non-existent-hotel')
      expect(result).toBe(false)
    })
  })

  describe('generatePermanentHotelQR', () => {
    it('should generate unique QR codes', async () => {
      const qr1 = await generatePermanentHotelQR('hotel-1')
      const qr2 = await generatePermanentHotelQR('hotel-2')

      expect(qr1.qrCode).not.toBe(qr2.qrCode)
      expect(qr1.qrCode.length).toBeGreaterThan(30) // 40 chars expected
      expect(qr2.qrCode.length).toBeGreaterThan(30)
    })

    it('should generate valid QR payload', async () => {
      const { qrPayload } = await generatePermanentHotelQR('test-hotel-123')
      const payload = JSON.parse(qrPayload)

      expect(payload.hotelId).toBe('test-hotel-123')
      expect(payload.type).toBe('hotel_entry')
    })

    it('should generate URL-safe QR codes', async () => {
      const { qrCode } = await generatePermanentHotelQR('test-hotel')

      // Check no special characters that could break URLs
      expect(qrCode).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe('QR Uniqueness', () => {
    it('should enforce unique QR codes per hotel', async () => {
      const hotel1 = await prisma.hotel.findUnique({
        where: { id: testHotelId },
        select: { qrCode: true }
      })

      // Try to create another hotel with same QR code (should fail at DB level)
      await expect(
        prisma.hotel.create({
          data: {
            name: 'Duplicate QR Hotel',
            slug: 'duplicate-qr-hotel',
            qrCode: hotel1!.qrCode!, // Same QR code
            qrPayload: '{"hotelId":"test","type":"hotel_entry"}'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('QR Payload Structure', () => {
    it('should have correct payload structure', async () => {
      const result = await getHotelQr(testHotelId)

      expect(result).not.toBeNull()
      expect(result?.qrPayload).toMatchObject({
        hotelId: expect.any(String),
        type: 'hotel_entry'
      })
      expect(Object.keys(result!.qrPayload)).toHaveLength(2)
    })

    it('should not include sensitive data in QR payload', async () => {
      const result = await getHotelQr(testHotelId)

      expect(result?.qrPayload).not.toHaveProperty('apiKey')
      expect(result?.qrPayload).not.toHaveProperty('stripeKey')
      expect(result?.qrPayload).not.toHaveProperty('password')
    })
  })
})
