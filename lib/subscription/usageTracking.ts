/**
 * Usage Tracking Service
 * Tracks and enforces usage limits for AI messages, voice, tickets, storage
 */

import { prisma } from '@/lib/prisma'
import { SubscriptionPlan } from '@prisma/client'
import { getPlanLimits } from './plans'

export class UsageLimitError extends Error {
  constructor(
    message: string,
    public limitType: string,
    public currentUsage: number,
    public limit: number,
    public upgradeUrl: string = '/settings/billing'
  ) {
    super(message)
    this.name = 'UsageLimitError'
  }
}

/**
 * Check if it's a new month and reset usage counters
 */
async function checkAndResetUsage(hotelId: string): Promise<void> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { 
      currentMonthStart: true, 
      subscriptionPlan: true,
      aiMessagesUsed: true,
      voiceMinutesUsed: true,
      ticketsCreated: true,
      storageUsedGB: true,
    },
  })

  if (!hotel) return

  const now = new Date()
  const currentMonthStart = new Date(hotel.currentMonthStart)
  
  // Check if we're in a new month
  if (
    now.getMonth() !== currentMonthStart.getMonth() ||
    now.getFullYear() !== currentMonthStart.getFullYear()
  ) {
    // Archive previous month's usage
    await prisma.usageRecord.create({
      data: {
        hotelId,
        month: currentMonthStart,
        year: currentMonthStart.getFullYear(),
        planAtTime: hotel.subscriptionPlan,
        aiMessages: hotel.aiMessagesUsed,
        voiceMinutes: hotel.voiceMinutesUsed,
        ticketsCreated: hotel.ticketsCreated,
        storageUsedGB: hotel.storageUsedGB,
      },
    })

    // Reset current usage
    await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1),
        aiMessagesUsed: 0,
        voiceMinutesUsed: 0,
        ticketsCreated: 0,
        // Note: storageUsedGB is not reset (cumulative)
      },
    })
  }
}

/**
 * Check if hotel can send AI messages
 */
export async function checkAIMessageLimit(hotelId: string, messagesNeeded: number = 1): Promise<void> {
  await checkAndResetUsage(hotelId)

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      maxAIMessagesPerMonth: true,
      aiMessagesUsed: true,
    },
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  if (hotel.maxAIMessagesPerMonth === 999999) {
    return
  }

  if (hotel.aiMessagesUsed + messagesNeeded > hotel.maxAIMessagesPerMonth) {
    throw new UsageLimitError(
      `AI message limit exceeded. You've used ${hotel.aiMessagesUsed} of ${hotel.maxAIMessagesPerMonth} messages this month.`,
      'AI_MESSAGES',
      hotel.aiMessagesUsed,
      hotel.maxAIMessagesPerMonth
    )
  }
}

/**
 * Increment AI message usage
 */
export async function incrementAIMessageUsage(hotelId: string, count: number = 1): Promise<void> {
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      aiMessagesUsed: {
        increment: count,
      },
    },
  })
}

/**
 * Check if hotel can use voice mode
 */
export async function checkVoiceLimit(hotelId: string, minutesNeeded: number = 1): Promise<void> {
  await checkAndResetUsage(hotelId)

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      maxVoiceMinutesPerMonth: true,
      voiceMinutesUsed: true,
    },
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  // Unlimited plans have maxVoiceMinutesPerMonth set to 999999
  if (hotel.maxVoiceMinutesPerMonth === 999999) {
    return // Unlimited
  }

  if (hotel.voiceMinutesUsed + minutesNeeded > hotel.maxVoiceMinutesPerMonth) {
    throw new UsageLimitError(
      `Voice usage limit exceeded. You've used ${hotel.voiceMinutesUsed} of ${hotel.maxVoiceMinutesPerMonth} minutes this month.`,
      'VOICE_MINUTES',
      hotel.voiceMinutesUsed,
      hotel.maxVoiceMinutesPerMonth
    )
  }
}

/**
 * Increment voice usage
 */
export async function incrementVoiceUsage(hotelId: string, minutes: number): Promise<void> {
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      voiceMinutesUsed: {
        increment: minutes,
      },
    },
  })
}

/**
 * Check if hotel can create tickets
 */
export async function checkTicketLimit(hotelId: string): Promise<void> {
  await checkAndResetUsage(hotelId)

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      maxTicketsPerMonth: true,
      ticketsCreated: true,
    },
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  // Unlimited plans have maxTicketsPerMonth set to 999999
  if (hotel.maxTicketsPerMonth === 999999) {
    return // Unlimited
  }

  if (hotel.ticketsCreated >= hotel.maxTicketsPerMonth) {
    throw new UsageLimitError(
      `Ticket creation limit exceeded. You've created ${hotel.ticketsCreated} of ${hotel.maxTicketsPerMonth} tickets this month.`,
      'TICKETS',
      hotel.ticketsCreated,
      hotel.maxTicketsPerMonth
    )
  }
}

/**
 * Increment ticket creation count
 */
export async function incrementTicketUsage(hotelId: string): Promise<void> {
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      ticketsCreated: {
        increment: 1,
      },
    },
  })
}

/**
 * Check storage limit
 */
export async function checkStorageLimit(hotelId: string, additionalGB: number): Promise<void> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      maxStorageGB: true,
      storageUsedGB: true,
    },
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  // Unlimited plans have maxStorageGB set to 999999
  if (hotel.maxStorageGB === 999999) {
    return // Unlimited
  }

  if (hotel.storageUsedGB + additionalGB > hotel.maxStorageGB) {
    throw new UsageLimitError(
      `Storage limit exceeded. You've used ${hotel.storageUsedGB.toFixed(2)}GB of ${hotel.maxStorageGB}GB.`,
      'STORAGE',
      Math.round(hotel.storageUsedGB * 100) / 100,
      hotel.maxStorageGB
    )
  }
}

/**
 * Increment storage usage
 */
export async function incrementStorageUsage(hotelId: string, gbUsed: number): Promise<void> {
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      storageUsedGB: {
        increment: gbUsed,
      },
    },
  })
}

/**
 * Get current usage for a hotel
 */
export async function getCurrentUsage(hotelId: string) {
  await checkAndResetUsage(hotelId)

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      maxAIMessagesPerMonth: true,
      maxVoiceMinutesPerMonth: true,
      maxTicketsPerMonth: true,
      maxStorageGB: true,
      aiMessagesUsed: true,
      voiceMinutesUsed: true,
      ticketsCreated: true,
      storageUsedGB: true,
      currentMonthStart: true,
    },
  })

  if (!hotel) {
    throw new Error('Hotel not found')
  }

  const limits = getPlanLimits(hotel.subscriptionPlan as any)

  return {
    plan: hotel.subscriptionPlan,
    currentMonth: hotel.currentMonthStart,
    aiMessages: {
      used: hotel.aiMessagesUsed,
      limit: hotel.maxAIMessagesPerMonth,
      percentage: Math.round((hotel.aiMessagesUsed / hotel.maxAIMessagesPerMonth) * 100),
      unlimited: hotel.maxAIMessagesPerMonth === 999999,
    },
    voice: {
      used: hotel.voiceMinutesUsed,
      limit: hotel.maxVoiceMinutesPerMonth,
      percentage: hotel.maxVoiceMinutesPerMonth === 999999 ? 0 : Math.round((hotel.voiceMinutesUsed / hotel.maxVoiceMinutesPerMonth) * 100),
      unlimited: hotel.maxVoiceMinutesPerMonth === 999999,
    },
    tickets: {
      used: hotel.ticketsCreated,
      limit: hotel.maxTicketsPerMonth,
      percentage: hotel.maxTicketsPerMonth === 999999 ? 0 : Math.round((hotel.ticketsCreated / hotel.maxTicketsPerMonth) * 100),
      unlimited: hotel.maxTicketsPerMonth === 999999,
    },
    storage: {
      used: Math.round(hotel.storageUsedGB * 100) / 100,
      limit: hotel.maxStorageGB,
      percentage: hotel.maxStorageGB === 999999 ? 0 : Math.round((hotel.storageUsedGB / hotel.maxStorageGB) * 100),
      unlimited: hotel.maxStorageGB === 999999,
    },
  }
}

/**
 * Get usage history for a hotel
 */
export async function getUsageHistory(hotelId: string, months: number = 6) {
  return await prisma.usageRecord.findMany({
    where: { hotelId },
    orderBy: { month: 'desc' },
    take: months,
  })
}

/**
 * Update plan limits when plan changes
 */
export async function updatePlanLimits(hotelId: string, newPlan: SubscriptionPlan): Promise<void> {
  const limits = getPlanLimits(newPlan as any)

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      subscriptionPlan: newPlan,
      maxAIMessagesPerMonth: limits.aiMessagesPerMonth,
      maxVoiceMinutesPerMonth: limits.voiceMinutesPerMonth === 'unlimited' ? 999999 : limits.voiceMinutesPerMonth,
      maxTicketsPerMonth: limits.ticketsPerMonth === 'unlimited' ? 999999 : limits.ticketsPerMonth,
      maxStorageGB: limits.storageGB === 'unlimited' ? 999999 : limits.storageGB,
    },
  })
}
