import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * Guest Session Service
 * Handles guest identification and temporary session creation
 * - Validates guest identity via passport or national ID
 * - Checks current stay dates
 * - Creates ephemeral sessions (no account creation)
 * - Session expires after checkout date
 */

export interface GuestIdentification {
  documentType: 'passport' | 'national_id'
  documentNumber: string
}

export interface ValidatedGuest {
  guestId: string
  firstName: string
  lastName: string
  email?: string
  roomNumber: string
  checkInDate: Date
  checkOutDate: Date
  hotelId: string
}

export interface GuestSessionResult {
  sessionId: string
  sessionToken: string
  guest: ValidatedGuest
  expiresAt: Date
}

/**
 * Validate guest identity and current stay
 * - Check guest exists in hotel
 * - Check identification document matches
 * - Verify current date is within stay period
 *
 * @param hotelId - Hotel ID from QR
 * @param documentType - 'passport' or 'national_id'
 * @param documentNumber - Document number to match
 * @returns Validated guest info or null if not found/invalid
 */
export async function validateGuestIdentity(
  hotelId: string,
  documentType: 'passport' | 'national_id',
  documentNumber: string
): Promise<ValidatedGuest | null> {
  // Verify hotel exists
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true }
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  // Find guest by document number
  const guest = await prisma.guest.findFirst({
    where: {
      hotelId,
      idType: documentType === 'passport' ? 'passport' : 'national_id',
      idNumber: documentNumber
    }
  })

  if (!guest) {
    return null
  }

  // Find active booking for this guest
  const now = new Date()
  const activeBooking = await prisma.booking.findFirst({
    where: {
      guestId: guest.id,
      hotelId,
      checkInDate: {
        lte: now
      },
      checkOutDate: {
        gte: now
      },
      status: {
        in: ['CONFIRMED', 'CHECKED_IN']
      }
    },
    include: {
      room: {
        select: {
          roomNumber: true
        }
      }
    }
  })

  if (!activeBooking || !activeBooking.room) {
    // No active booking or not checked in yet
    return null
  }

  return {
    guestId: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.email || undefined,
    roomNumber: activeBooking.room.roomNumber,
    checkInDate: activeBooking.checkInDate,
    checkOutDate: activeBooking.checkOutDate,
    hotelId
  }
}

/**
 * Create temporary guest session after validation
 * - Session expires at checkout date (or 24h, whichever is sooner)
 * - Contains session token for chat access
 * - Links to guest identification
 *
 * @param hotelId - Hotel ID
 * @param guest - Validated guest info
 * @returns Session details for chat access
 */
export async function createGuestSession(
  hotelId: string,
  guest: ValidatedGuest
): Promise<GuestSessionResult> {
  // Generate secure session token
  const sessionToken = randomBytes(32).toString('hex')

  // Calculate expiry: checkout date or 24h from now, whichever is sooner
  const checkoutTime = new Date(guest.checkOutDate.getTime())
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const expiresAt = checkoutTime < tomorrow ? checkoutTime : tomorrow

  // Create guest session record
  const guestSession = await prisma.guestSession.create({
    data: {
      hotelId,
      sessionToken,
      guestName: `${guest.firstName} ${guest.lastName}`,
      guestRoomNumber: guest.roomNumber,
      guestPassportId: guest.guestId, // Reference to guest record, not credential
      expiresAt,
      lastActiveAt: new Date()
    }
  })

  return {
    sessionId: guestSession.id,
    sessionToken: guestSession.sessionToken,
    guest,
    expiresAt: guestSession.expiresAt
  }
}

/**
 * Verify guest session token is valid and not expired
 * Updates lastActiveAt timestamp
 *
 * @param sessionToken - Session token from query params
 * @returns Session details or null if invalid/expired
 */
export async function verifyGuestSession(sessionToken: string) {
  const session = await prisma.guestSession.findUnique({
    where: { sessionToken },
    include: {
      hotel: {
        select: { id: true, name: true }
      }
    }
  })

  if (!session) {
    return null
  }

  const now = new Date()

  // Check if expired
  if (session.expiresAt < now) {
    return null
  }

  // Update last active time
  await prisma.guestSession.update({
    where: { id: session.id },
    data: { lastActiveAt: now }
  })

  return {
    id: session.id,
    hotelId: session.hotelId,
    guestName: session.guestName,
    guestRoomNumber: session.guestRoomNumber,
    expiresAt: session.expiresAt,
    sessionToken: session.sessionToken
  }
}

/**
 * Get guest session details (for verification step)
 * Used to confirm guest info before final session creation
 *
 * @param hotelId - Hotel ID
 * @param documentType - Passport or national ID
 * @param documentNumber - Document number
 * @returns Guest info with stay dates or error
 */
export async function getGuestCheckoutDate(
  hotelId: string,
  documentType: 'passport' | 'national_id',
  documentNumber: string
) {
  const validatedGuest = await validateGuestIdentity(
    hotelId,
    documentType,
    documentNumber
  )

  if (!validatedGuest) {
    return null
  }

  return {
    guestName: `${validatedGuest.firstName} ${validatedGuest.lastName}`,
    roomNumber: validatedGuest.roomNumber,
    checkInDate: validatedGuest.checkInDate,
    checkOutDate: validatedGuest.checkOutDate,
    hotelId
  }
}

/**
 * Invalidate guest session (logout)
 * Used when guest explicitly logs out
 *
 * @param sessionId - Session ID to invalidate
 */
export async function invalidateGuestSession(sessionId: string) {
  await prisma.guestSession.update({
    where: { id: sessionId },
    data: {
      expiresAt: new Date() // Immediately expire
    }
  })
}
