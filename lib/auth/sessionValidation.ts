import { prisma } from '@/lib/prisma'

/**
 * Session validation helpers for Staff and Guest sessions
 * Used by middleware and API routes to verify session tokens
 */

export interface StaffSessionData {
  id: string
  userId: string
  hotelId: string
  sessionType: 'STAFF'
  canAccessKB: boolean
  canViewTickets: boolean
  canCreateTickets: boolean
  expiresAt: Date
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
  hotel: {
    id: string
    name: string
  }
}

export interface GuestSessionData {
  id: string
  hotelId: string
  sessionType: 'GUEST'
  guestName: string | null
  guestRoomNumber: string | null
  conversationId: string | null
  expiresAt: Date
  hotel: {
    id: string
    name: string
  }
}

/**
 * Validate staff session token
 * Returns session data if valid, null if invalid/expired
 */
export async function validateStaffSession(
  token: string
): Promise<StaffSessionData | null> {
  try {
    const session = await prisma.staffSession.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isSuspended: true
          }
        },
        hotel: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!session) {
      return null
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.staffSession.delete({
        where: { id: session.id }
      })
      return null
    }

    // Check if user is suspended
    if (session.user.isSuspended) {
      return null
    }

    // Update last active time
    await prisma.staffSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() }
    })

    return {
      id: session.id,
      userId: session.userId,
      hotelId: session.hotelId,
      sessionType: session.sessionType as 'STAFF',
      canAccessKB: session.canAccessKB,
      canViewTickets: session.canViewTickets,
      canCreateTickets: session.canCreateTickets,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      },
      hotel: {
        id: session.hotel.id,
        name: session.hotel.name
      }
    }
  } catch (error) {
    console.error('Staff session validation error:', error)
    return null
  }
}

/**
 * Validate guest session token
 * Returns session data if valid, null if invalid/expired
 */
export async function validateGuestSession(
  token: string
): Promise<GuestSessionData | null> {
  try {
    const session = await prisma.guestSession.findUnique({
      where: { sessionToken: token },
      include: {
        hotel: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!session) {
      return null
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.guestSession.delete({
        where: { id: session.id }
      })
      return null
    }

    // Update last active time
    await prisma.guestSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() }
    })

    return {
      id: session.id,
      hotelId: session.hotelId,
      sessionType: session.sessionType as 'GUEST',
      guestName: session.guestName,
      guestRoomNumber: session.guestRoomNumber,
      conversationId: session.conversationId,
      expiresAt: session.expiresAt,
      hotel: {
        id: session.hotel.id,
        name: session.hotel.name
      }
    }
  } catch (error) {
    console.error('Guest session validation error:', error)
    return null
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    const now = new Date()

    // Delete expired staff sessions
    const deletedStaff = await prisma.staffSession.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    })

    // Delete expired guest sessions
    const deletedGuest = await prisma.guestSession.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    })

    console.log(`Cleaned up ${deletedStaff.count} staff sessions and ${deletedGuest.count} guest sessions`)

    return {
      staffSessions: deletedStaff.count,
      guestSessions: deletedGuest.count
    }
  } catch (error) {
    console.error('Session cleanup error:', error)
    return {
      staffSessions: 0,
      guestSessions: 0
    }
  }
}
