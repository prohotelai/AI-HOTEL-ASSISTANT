import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

/**
 * QR Token Service for PMS
 * 
 * Handles generation and validation of QR tokens for guest check-in/check-out
 */

export interface QRTokenPayload {
  guestId: string
  bookingId: string
  roomId: string
  hotelId: string
  stayId?: string
  action: 'CHECK_IN' | 'CHECK_OUT'
  expiresAt: number
}

export interface StayData {
  id: string
  guestId: string
  bookingId: string
  roomId: string
  hotelId: string
  checkInTime: Date
  checkOutTime?: Date
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
}

/**
 * Generate a QR token for guest check-in/check-out
 * QR tokens are time-limited and contain booking information
 */
export async function generateQRToken(
  guestId: string,
  bookingId: string,
  roomId: string,
  hotelId: string,
  action: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN',
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const payload: QRTokenPayload = {
    guestId,
    bookingId,
    roomId,
    hotelId,
    action,
    expiresAt: now + expiresIn
  }

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: `${expiresIn}s`,
    issuer: 'ai-hotel-assistant',
    subject: `qr-${action.toLowerCase()}-${bookingId}`
  })
}

/**
 * Verify and decode a QR token
 */
export function verifyQRToken(token: string): QRTokenPayload | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET not configured')
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'ai-hotel-assistant'
    }) as QRTokenPayload

    // Check expiration
    if (decoded.expiresAt < Math.floor(Date.now() / 1000)) {
      return null
    }

    return decoded
  } catch (error) {
    console.error('QR token verification failed:', error)
    return null
  }
}

/**
 * Create a stay record when guest checks in
 */
export async function createStay(
  guestId: string,
  bookingId: string,
  roomId: string,
  hotelId: string
): Promise<StayData> {
  // First, verify the booking and room exist
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true }
  })

  if (!booking) {
    throw new Error('Booking not found')
  }

  if (booking.room.hotelId !== hotelId) {
    throw new Error('Booking does not belong to this hotel')
  }

  // Check if room matches
  if (booking.room.id !== roomId) {
    throw new Error('Room does not match booking')
  }

  // Check if guest matches
  if (booking.guestId !== guestId) {
    throw new Error('Guest does not match booking')
  }

  // Create stay record (using booking as stay for now)
  // In a real system, you might have a separate Stay table
  const stay: StayData = {
    id: bookingId, // Using booking ID as stay ID for now
    guestId,
    bookingId,
    roomId,
    hotelId,
    checkInTime: new Date(),
    status: 'ACTIVE'
  }

  return stay
}

/**
 * Complete a stay record when guest checks out
 */
export async function completeStay(
  stayId: string,
  hotelId: string
): Promise<StayData> {
  // Fetch the booking/stay
  const booking = await prisma.booking.findUnique({
    where: { id: stayId },
    include: { room: true }
  })

  if (!booking) {
    throw new Error('Stay/booking not found')
  }

  if (booking.room.hotelId !== hotelId) {
    throw new Error('Stay does not belong to this hotel')
  }

  // Update booking status to checked out
  const updated = await prisma.booking.update({
    where: { id: stayId },
    data: { status: 'CHECKED_OUT' },
    include: { room: true }
  })

  return {
    id: updated.id,
    guestId: updated.guestId,
    bookingId: updated.id,
    roomId: updated.roomId,
    hotelId: updated.room.hotelId,
    checkInTime: updated.checkInDate,
    checkOutTime: new Date(),
    status: 'COMPLETED'
  }
}

/**
 * Get active stay for a guest
 */
export async function getActiveStay(
  guestId: string,
  hotelId: string
): Promise<StayData | null> {
  const booking = await prisma.booking.findFirst({
    where: {
      guestId,
      status: 'CHECKED_IN',
      room: { hotelId }
    },
    include: { room: true }
  })

  if (!booking) {
    return null
  }

  return {
    id: booking.id,
    guestId: booking.guestId,
    bookingId: booking.id,
    roomId: booking.roomId,
    hotelId: booking.room.hotelId,
    checkInTime: booking.checkInDate,
    status: 'ACTIVE'
  }
}
