/**
 * Guest Service - Manage guest profiles (CRM)
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'

export interface CreateGuestInput {
  hotelId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  idType?: string
  idNumber?: string
  address?: string
  city?: string
  country?: string
  postalCode?: string
  preferences?: any // JSON field
  notes?: string
  vipStatus?: boolean
  // TODO Phase 5+: Add these fields to Guest model when implementing CRM
  // nationality?: string
  // dateOfBirth?: Date
  // gender?: string
  // idExpiry?: Date
  // idImageUrl?: string
  // state?: string
  // roomPreferences?: string[]
  // dietaryNeeds?: string[]
  // specialRequests?: string
  // language?: string
  // emailOptIn?: boolean
  // smsOptIn?: boolean
  // marketingOptIn?: boolean
}

export interface UpdateGuestInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  nationality?: string
  dateOfBirth?: Date
  gender?: string
  idType?: string
  idNumber?: string
  idExpiry?: Date
  idImageUrl?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  roomPreferences?: string[]
  dietaryNeeds?: string[]
  specialRequests?: string
  language?: string
  vipStatus?: boolean
  loyaltyNumber?: string
  emailOptIn?: boolean
  smsOptIn?: boolean
  marketingOptIn?: boolean
  internalNotes?: string
}

/**
 * Create new guest profile
 */
export async function createGuest(input: CreateGuestInput) {
  // Check if guest already exists
  const existing = await prisma.guest.findFirst({
    where: {
      hotelId: input.hotelId,
      email: input.email
    }
  })

  if (existing) {
    throw new Error('Guest with this email already exists')
  }

  const guest = await prisma.guest.create({
    data: {
      ...input
      // TODO Phase 5+: Add language, emailOptIn, smsOptIn, marketingOptIn fields to Guest model
    }
  })

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('guest.created', {
  //    guestId: guest.id,
  //    hotelId: guest.hotelId,
  //    email: guest.email
  //  })

  return guest
}

/**
 * Get guest by ID
 */
export async function getGuest(guestId: string, hotelId: string) {
  return prisma.guest.findUnique({
    where: { id: guestId, hotelId },
    include: {
      bookings: {
        orderBy: { checkInDate: 'desc' },
        take: 10,
        include: {
          room: {
            select: {
              roomNumber: true,
              roomType: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      },
      _count: {
        select: {
          bookings: true
        }
      }
    }
  })
}

/**
 * Get guest by email
 */
export async function getGuestByEmail(email: string, hotelId: string) {
  return prisma.guest.findFirst({
    where: {
      email,
      hotelId
    },
    include: {
      bookings: {
        orderBy: { checkInDate: 'desc' },
        take: 5
      }
    }
  })
}

/**
 * List guests with filters
 */
export async function listGuests(
  hotelId: string,
  options?: {
    search?: string
    vipStatus?: string
    limit?: number
    offset?: number
  }
) {
  const where: any = { hotelId }

  if (options?.search) {
    where.OR = [
      { firstName: { contains: options.search, mode: 'insensitive' } },
      { lastName: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
      { phone: { contains: options.search, mode: 'insensitive' } }
    ]
  }

  if (options?.vipStatus) {
    where.vipStatus = options.vipStatus
  }

  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: [
        // TODO Phase 5+: Re-enable when totalStays field is added
        // { totalStays: 'desc' },
        { lastName: 'asc' }
      ],
      take: options?.limit || 50,
      skip: options?.offset || 0
    }),
    prisma.guest.count({ where })
  ])

  return { guests, total }
}

/**
 * Update guest profile
 */
export async function updateGuest(guestId: string, hotelId: string, input: UpdateGuestInput) {
  const guest = await prisma.guest.update({
    where: { id: guestId, hotelId },
    data: input
  })

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('guest.updated', {
  //    guestId: guest.id,
  //    hotelId: guest.hotelId
  //  })

  return guest
}

/**
 * Set guest VIP status
 */
export async function setVIPStatus(guestId: string, hotelId: string, isVip: boolean) {
  const guest = await prisma.guest.update({
    where: { id: guestId, hotelId },
    data: { vipStatus: isVip }
  })

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('guest.vipStatusChanged', {
  //   guestId: guest.id,
  //   hotelId: guest.hotelId,
  //   isVip
  // })

  return guest
}

/**
 * Add loyalty points
 */
export async function addLoyaltyPoints(guestId: string, hotelId: string, points: number) {
  const guest = await prisma.guest.update({
    where: { id: guestId, hotelId },
    data: {
      loyaltyPoints: {
        increment: points
      }
    }
  })

  return guest
}

/**
 * Update guest statistics after booking
 */
export async function updateGuestStats(guestId: string, hotelId: string, bookingAmount: number) {
  const guest = await prisma.guest.update({
    where: { id: guestId, hotelId },
    data: {
      totalStays: { increment: 1 },
      totalSpent: { increment: bookingAmount },
      lastStayDate: new Date()
    }
  })

  // Auto-upgrade loyalty tier based on spending
  let newTier = guest.loyaltyTier
  const totalSpentNum = Number(guest.totalSpent)
  if (totalSpentNum >= 50000 && guest.loyaltyTier !== 'PLATINUM') {
    newTier = 'PLATINUM'
  } else if (totalSpentNum >= 25000 && guest.loyaltyTier !== 'GOLD' && guest.loyaltyTier !== 'PLATINUM') {
    newTier = 'GOLD'
  } else if (totalSpentNum >= 10000 && !guest.loyaltyTier) {
    newTier = 'SILVER'
  }

  if (newTier !== guest.loyaltyTier) {
    await prisma.guest.update({
      where: { id: guestId, hotelId },
      data: { loyaltyTier: newTier }
    })
    
    // Set VIP status for GOLD and PLATINUM tiers
    if (newTier === 'GOLD' || newTier === 'PLATINUM') {
      await setVIPStatus(guestId, hotelId, true)
    }
  }

  return guest
}

/**
 * Get guest preferences
 */
export async function getGuestPreferences(guestId: string, hotelId: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId, hotelId },
    select: {
      preferences: true,
      language: true,
      vipStatus: true,
      loyaltyTier: true
    }
  })

  return guest
}

/**
 * Get guest booking history
 */
export async function getGuestBookingHistory(guestId: string, hotelId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      guestId,
      hotelId
    },
    include: {
      room: {
        select: {
          roomNumber: true,
          roomType: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { checkInDate: 'desc' }
  })

  return bookings
}

/**
 * Merge duplicate guest profiles
 */
export async function mergeGuestProfiles(
  primaryGuestId: string,
  secondaryGuestId: string,
  hotelId: string
) {
  // Transfer all bookings to primary guest
  await prisma.booking.updateMany({
    where: {
      guestId: secondaryGuestId,
      hotelId
    },
    data: {
      guestId: primaryGuestId
    }
  })

  // Update primary guest stats
  const secondaryGuest = await prisma.guest.findUnique({
    where: { id: secondaryGuestId, hotelId }
  })

  if (secondaryGuest) {
    await prisma.guest.update({
      where: { id: primaryGuestId, hotelId },
      data: {
        totalStays: { increment: secondaryGuest.totalStays },
        totalSpent: { increment: secondaryGuest.totalSpent }
      }
    })

    // Delete secondary guest
    await prisma.guest.delete({
      where: { id: secondaryGuestId, hotelId }
    })
  }

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('guest.merged', {
  //   primaryGuestId,
  //   secondaryGuestId,
  //   hotelId
  // })

  return prisma.guest.findUnique({
    where: { id: primaryGuestId, hotelId }
  })
}

/**
 * Get guest statistics
 */
export async function getGuestStatistics(hotelId: string) {
  const [
    totalGuests,
    vipGuests,
    newGuestsThisMonth,
    repeatGuests
  ] = await Promise.all([
    prisma.guest.count({ where: { hotelId } }),
    prisma.guest.count({
      where: {
        hotelId,
        vipStatus: true
      }
    }),
    prisma.guest.count({
      where: {
        hotelId,
        createdAt: {
          gte: new Date(new Date().setDate(1)) // First day of current month
        }
      }
    }),
    prisma.guest.count({
      where: {
        hotelId,
        totalStays: { gt: 1 }
      }
    })
  ])

  return {
    totalGuests,
    vipGuests,
    newGuestsThisMonth,
    repeatGuests,
    repeatGuestRate: totalGuests > 0 ? (repeatGuests / totalGuests) * 100 : 0
  }
}

/**
 * Delete guest (only if no bookings)
 */
export async function deleteGuest(guestId: string, hotelId: string) {
  const bookingCount = await prisma.booking.count({
    where: { guestId, hotelId }
  })

  if (bookingCount > 0) {
    throw new Error('Cannot delete guest with existing bookings')
  }

  await prisma.guest.delete({
    where: { id: guestId, hotelId }
  })

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('guest.deleted', {
  //   guestId,
  //   hotelId
  // })

  return { success: true }
}
