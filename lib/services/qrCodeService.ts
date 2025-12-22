import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * QR Code Access Service
 * Manages unified QR codes for hotel access
 */

export interface HotelQRCodeData {
  hotelId: string
}

/**
 * Generate a new QR token (short, URL-safe)
 */
function generateQRToken(): string {
  // Generate 16 random bytes and convert to hex = 32 char alphanumeric
  return randomBytes(16).toString('hex')
}

/**
 * Create or regenerate QR code for a hotel
 * - Invalidates previous QR codes
 * - Returns new QR token and redirect URL
 *
 * @param hotelId Hotel ID
 * @param createdBy Admin user ID who is generating the QR
 */
export async function generateHotelQRCode(
  hotelId: string,
  createdBy: string
): Promise<{
  token: string
  qrUrl: string
  redirectUrl: string
  content: HotelQRCodeData
}> {
  // Validate hotel exists
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true }
  })

  if (!hotel) {
    throw new Error(`Hotel not found: ${hotelId}`)
  }

  // Generate new token
  const token = generateQRToken()

  // Prepare QR content
  const qrContent: HotelQRCodeData = {
    hotelId
  }

  // Use transaction to:
  // 1. Deactivate old QR codes
  // 2. Create new QR code
  const result = await prisma.$transaction(async (tx) => {
    // Deactivate previous active QR codes
    const previousQR = await tx.hotelQRCode.findFirst({
      where: {
        hotelId,
        isActive: true
      }
    })

    if (previousQR) {
      await tx.hotelQRCode.update({
        where: { id: previousQR.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy: createdBy
        }
      })
    }

    // Create new QR code
    const newQR = await tx.hotelQRCode.create({
      data: {
        hotelId,
        token,
        qrContent: JSON.stringify(qrContent),
        isActive: true,
        createdBy,
        metadata: JSON.stringify({
          generatedAt: new Date().toISOString(),
          generator: createdBy
        })
      }
    })

    return newQR
  })

  return {
    token,
    qrUrl: `https://your-domain.com/access?hotelId=${hotelId}`,
    redirectUrl: `/access?hotelId=${hotelId}`,
    content: qrContent
  }
}

/**
 * Validate and retrieve QR code by token
 * - Checks if token is active and valid
 * - Returns hotel ID from QR content
 */
export async function validateQRToken(
  token: string
): Promise<HotelQRCodeData | null> {
  const qr = await prisma.hotelQRCode.findUnique({
    where: { token },
    select: {
      isActive: true,
      qrContent: true,
      hotel: {
        select: { id: true }
      }
    }
  })

  // Token must exist and be active
  if (!qr || !qr.isActive) {
    return null
  }

  try {
    const content = JSON.parse(qr.qrContent) as HotelQRCodeData
    return content
  } catch (error) {
    console.error('Failed to parse QR content:', error)
    return null
  }
}

/**
 * Validate QR token by hotelId (from URL params)
 * - Ensures hotel has an active QR code
 * - Returns the token if valid
 */
export async function validateHotelHasActiveQR(
  hotelId: string
): Promise<boolean> {
  const qr = await prisma.hotelQRCode.findFirst({
    where: {
      hotelId,
      isActive: true
    },
    select: { id: true }
  })

  return !!qr
}

/**
 * Get active QR code for a hotel
 */
export async function getActiveQRCode(hotelId: string) {
  const qr = await prisma.hotelQRCode.findFirst({
    where: {
      hotelId,
      isActive: true
    },
    select: {
      token: true,
      qrContent: true,
      createdAt: true,
      createdBy: true
    }
  })

  return qr
}

/**
 * Revoke QR code for a hotel
 */
export async function revokeQRCode(
  hotelId: string,
  revokedBy: string
): Promise<void> {
  const qr = await prisma.hotelQRCode.findFirst({
    where: {
      hotelId,
      isActive: true
    }
  })

  if (!qr) {
    throw new Error(`No active QR code found for hotel: ${hotelId}`)
  }

  await prisma.hotelQRCode.update({
    where: { id: qr.id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy
    }
  })
}
