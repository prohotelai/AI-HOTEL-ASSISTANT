/**
 * AI Read Model: Guest
 * 
 * SAFETY: Read-only guest profiles for AI agents
 * - PII fields masked based on permissions
 * - No payment info exposed
 * - No password hashes
 * - Hotel scoping enforced
 */

import { prisma } from '@/lib/prisma'

export interface GuestReadModel {
  id: string
  name: string
  email?: string // Masked if no permission
  phone?: string // Masked if no permission
  vipStatus: boolean
  loyaltyTier?: string
  loyaltyPoints: number
  totalStays: number
  totalSpent?: string // Masked if no permission
  lastStayDate?: string
  language?: string
  preferences?: string // Summarized, not full JSON
}

/**
 * Get guest profile for AI (with field masking)
 */
export async function getGuestForAI(
  hotelId: string,
  guestId: string,
  options: {
    includePII?: boolean // Requires staff permission
    includeFinancials?: boolean // Requires manager permission
  } = {}
): Promise<GuestReadModel | null> {
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, hotelId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      vipStatus: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      totalStays: true,
      totalSpent: true,
      lastStayDate: true,
      language: true,
      preferences: true
    }
  })

  if (!guest) return null

  // Build preference summary (not full JSON)
  let preferenceSummary: string | undefined
  if (guest.preferences && typeof guest.preferences === 'object') {
    const prefs = guest.preferences as any
    const items: string[] = []
    if (prefs.roomPreferences) items.push(`Room: ${prefs.roomPreferences}`)
    if (prefs.dietaryNeeds) items.push(`Diet: ${prefs.dietaryNeeds}`)
    if (prefs.accessibility) items.push('Accessibility needs')
    preferenceSummary = items.join(', ') || undefined
  }

  return {
    id: guest.id,
    name: `${guest.firstName} ${guest.lastName}`,
    email: options.includePII ? guest.email || undefined : undefined,
    phone: options.includePII ? guest.phone || undefined : undefined,
    vipStatus: guest.vipStatus,
    loyaltyTier: guest.loyaltyTier || undefined,
    loyaltyPoints: guest.loyaltyPoints,
    totalStays: guest.totalStays,
    totalSpent: options.includeFinancials ? guest.totalSpent.toString() : undefined,
    lastStayDate: guest.lastStayDate?.toISOString(),
    language: guest.language || undefined,
    preferences: preferenceSummary
  }
}

/**
 * Search guests for AI (limited results)
 */
export async function searchGuestsForAI(
  hotelId: string,
  query: string,
  options: {
    includePII?: boolean
    limit?: number
  } = {}
): Promise<GuestReadModel[]> {
  const limit = Math.min(options.limit || 20, 50) // Max 50 results

  const guests = await prisma.guest.findMany({
    where: {
      hotelId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: options.includePII ? { contains: query, mode: 'insensitive' } : undefined }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      vipStatus: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      totalStays: true,
      totalSpent: true,
      lastStayDate: true
    },
    take: limit,
    orderBy: { totalStays: 'desc' }
  })

  return guests.map(guest => ({
    id: guest.id,
    name: `${guest.firstName} ${guest.lastName}`,
    email: options.includePII ? guest.email || undefined : undefined,
    phone: options.includePII ? guest.phone || undefined : undefined,
    vipStatus: guest.vipStatus,
    loyaltyTier: guest.loyaltyTier || undefined,
    loyaltyPoints: guest.loyaltyPoints,
    totalStays: guest.totalStays,
    totalSpent: undefined, // Never expose in search
    lastStayDate: guest.lastStayDate?.toISOString()
  }))
}

/**
 * Get VIP guests for AI
 */
export async function getVIPGuestsForAI(hotelId: string): Promise<GuestReadModel[]> {
  const guests = await prisma.guest.findMany({
    where: {
      hotelId,
      vipStatus: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      vipStatus: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      totalStays: true,
      lastStayDate: true
    },
    take: 50,
    orderBy: { totalSpent: 'desc' }
  })

  return guests.map(guest => ({
    id: guest.id,
    name: `${guest.firstName} ${guest.lastName}`,
    vipStatus: guest.vipStatus,
    loyaltyTier: guest.loyaltyTier || undefined,
    loyaltyPoints: guest.loyaltyPoints,
    totalStays: guest.totalStays,
    lastStayDate: guest.lastStayDate?.toISOString()
  }))
}
