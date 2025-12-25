import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * Hotel QR Service - Permanent Hotel Identity QR System
 * 
 * ARCHITECTURE:
 * - ONE QR per hotel (permanent identity)
 * - Generated ONCE on hotel creation
 * - NOT regenerable by users (only system-level)
 * - Stored in Hotel.qrCode and Hotel.qrPayload
 * 
 * QR Payload (static):
 * {
 *   "hotelId": "<HOTEL_ID>",
 *   "type": "hotel_entry"
 * }
 * 
 * BACKWARD COMPATIBILITY:
 * - Legacy QR endpoints return 410 Gone
 * - All legacy QR scans redirect to permanent hotel QR
 * - Deprecation warnings logged for monitoring
 */

export interface HotelQRPayload {
  hotelId: string
  type: 'hotel_entry'
}

/**
 * Generate a permanent QR token for hotel
 * Used ONLY during hotel creation
 */
function generatePermanentQRToken(): string {
  // Generate 20 random bytes = 40 char hex string (URL-safe, unique)
  return randomBytes(20).toString('hex')
}

/**
 * Create QR payload for hotel
 */
function createQRPayload(hotelId: string): HotelQRPayload {
  return {
    hotelId,
    type: 'hotel_entry'
  }
}

/**
 * Generate permanent QR code for hotel (INTERNAL USE ONLY)
 * Called ONLY during hotel creation
 * 
 * @param hotelId - Hotel ID
 * @returns QR code token and payload
 */
export async function generatePermanentHotelQR(hotelId: string): Promise<{
  qrCode: string
  qrPayload: string
}> {
  const qrCode = generatePermanentQRToken()
  const payload = createQRPayload(hotelId)
  const qrPayload = JSON.stringify(payload)

  return {
    qrCode,
    qrPayload
  }
}

/**
 * Get hotel QR code (READ ONLY)
 * This is the primary function for retrieving hotel QR
 * 
 * @param hotelId - Hotel ID
 * @returns Hotel QR data or null if not found
 */
export async function getHotelQr(hotelId: string): Promise<{
  qrCode: string
  qrPayload: HotelQRPayload
  qrUrl: string
  hotelName: string
} | null> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      name: true,
      qrCode: true,
      qrPayload: true
    }
  })

  if (!hotel || !hotel.qrCode || !hotel.qrPayload) {
    return null
  }

  try {
    const payload = JSON.parse(hotel.qrPayload) as HotelQRPayload
    
    // Construct QR URL (can be customized per deployment)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrUrl = `${baseUrl}/access?qr=${hotel.qrCode}`

    return {
      qrCode: hotel.qrCode,
      qrPayload: payload,
      qrUrl,
      hotelName: hotel.name
    }
  } catch (error) {
    console.error('Failed to parse QR payload for hotel:', hotelId, error)
    return null
  }
}

/**
 * Validate QR code and return hotel info
 * Public endpoint - used when QR is scanned
 * 
 * @param qrCode - QR code token from URL
 * @returns Hotel info if valid, null otherwise
 */
export async function validateHotelQr(qrCode: string): Promise<{
  hotelId: string
  hotelName: string
  payload: HotelQRPayload
} | null> {
  const hotel = await prisma.hotel.findUnique({
    where: { qrCode },
    select: {
      id: true,
      name: true,
      qrPayload: true
    }
  })

  if (!hotel || !hotel.qrPayload) {
    return null
  }

  try {
    const payload = JSON.parse(hotel.qrPayload) as HotelQRPayload
    
    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      payload
    }
  } catch (error) {
    console.error('Failed to parse QR payload during validation:', error)
    return null
  }
}

/**
 * SYSTEM-ONLY: Regenerate QR for hotel (emergency use only)
 * Requires system-level permissions
 * Use case: Security incident, QR compromise
 * 
 * @param hotelId - Hotel ID
 * @param adminUserId - Admin user performing regeneration
 * @returns New QR data
 */
export async function regenerateHotelQr(
  hotelId: string,
  adminUserId: string,
  reason: string
): Promise<{
  qrCode: string
  qrPayload: string
  qrUrl: string
}> {
  // Generate new QR
  const { qrCode, qrPayload } = await generatePermanentHotelQR(hotelId)

  // Update hotel record
  const hotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      qrCode,
      qrPayload
    },
    select: {
      id: true,
      name: true,
      qrCode: true,
      qrPayload: true
    }
  })

  // Log regeneration event
  await prisma.auditLog.create({
    data: {
      hotelId,
      userId: adminUserId,
      eventType: 'qr_regenerated',
      action: 'Hotel QR code regenerated',
      resourceType: 'hotel',
      resourceId: hotelId,
      success: true,
      severity: 'WARNING',
      metadata: {
        reason,
        oldQrCode: '[redacted]',
        newQrCode: qrCode.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      }
    }
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const qrUrl = `${baseUrl}/access?qr=${qrCode}`

  return {
    qrCode,
    qrPayload,
    qrUrl
  }
}

/**
 * Check if hotel has a valid QR code
 * 
 * @param hotelId - Hotel ID
 * @returns true if hotel has valid QR, false otherwise
 */
export async function hotelHasQr(hotelId: string): Promise<boolean> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      qrCode: true,
      qrPayload: true
    }
  })

  return !!(hotel && hotel.qrCode && hotel.qrPayload)
}
