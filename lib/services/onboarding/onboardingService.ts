/**
 * Onboarding Service
 * Manages hotel onboarding wizard progress and analytics
 */

import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

export type OnboardingStep =
  | 'welcome'
  | 'profile'
  | 'website-scan'
  | 'knowledge-base'
  | 'widget'
  | 'integrations'
  | 'invite-staff'
  | 'test'
  | 'finish'

export interface OnboardingProgressData {
  id: string
  hotelId: string
  currentStep: string
  stepsCompleted: string[]
  fastTrackMode: boolean
  isCompleted: boolean
  completedAt: Date | null
  totalTimeSpent: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Get onboarding progress for a hotel
 */
export async function getOnboardingProgress(
  hotelId: string
): Promise<OnboardingProgressData | null> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
  })

  if (!progress) return null

  return {
    ...progress,
    stepsCompleted: Array.isArray(progress.stepsCompleted)
      ? (progress.stepsCompleted as string[])
      : [],
  }
}

/**
 * Initialize onboarding for a new hotel
 */
export async function initializeOnboarding(
  hotelId: string,
  fastTrack: boolean = false
): Promise<OnboardingProgressData> {
  const existing = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
  })

  if (existing) {
    return {
      ...existing,
      stepsCompleted: Array.isArray(existing.stepsCompleted)
        ? (existing.stepsCompleted as string[])
        : [],
    }
  }

  const progress = await prisma.onboardingProgress.create({
    data: {
      hotelId,
      currentStep: 'welcome',
      stepsCompleted: [],
      fastTrackMode: fastTrack,
    },
  })

  // Log initialization
  await logOnboardingEvent(hotelId, 'onboarding_started', 'welcome', {
    fastTrack,
  })

  return {
    ...progress,
    stepsCompleted: [],
  }
}

/**
 * Update onboarding progress
 */
export async function updateOnboardingProgress(
  hotelId: string,
  data: {
    currentStep?: string
    completedStep?: string
    timeSpent?: number
  }
): Promise<OnboardingProgressData> {
  const existing = await getOnboardingProgress(hotelId)

  if (!existing) {
    throw new Error('Onboarding not initialized')
  }

  const stepsCompleted = existing.stepsCompleted

  // Add completed step if provided and not already completed
  if (data.completedStep && !stepsCompleted.includes(data.completedStep)) {
    stepsCompleted.push(data.completedStep)

    // Log step completion
    await logOnboardingEvent(hotelId, 'step_completed', data.completedStep, {
      timeSpent: data.timeSpent,
    })
  }

  const updateData: any = {
    stepsCompleted,
    updatedAt: new Date(),
  }

  if (data.currentStep) {
    updateData.currentStep = data.currentStep

    // Log step navigation
    await logOnboardingEvent(hotelId, 'step_started', data.currentStep)
  }

  if (data.timeSpent) {
    updateData.totalTimeSpent = existing.totalTimeSpent + data.timeSpent
    updateData.lastStepTime = data.timeSpent
  }

  const updated = await prisma.onboardingProgress.update({
    where: { hotelId },
    data: updateData,
  })

  return {
    ...updated,
    stepsCompleted: Array.isArray(updated.stepsCompleted)
      ? (updated.stepsCompleted as string[])
      : stepsCompleted,
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(
  hotelId: string
): Promise<OnboardingProgressData> {
  const updated = await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      isCompleted: true,
      completedAt: new Date(),
      currentStep: 'finish',
    },
  })

  // Log completion
  await logOnboardingEvent(hotelId, 'onboarding_completed', 'finish', {
    totalTime: updated.totalTimeSpent,
  })

  return {
    ...updated,
    stepsCompleted: Array.isArray(updated.stepsCompleted)
      ? (updated.stepsCompleted as string[])
      : [],
  }
}

/**
 * Skip onboarding
 */
export async function skipOnboarding(hotelId: string): Promise<void> {
  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      skippedAt: new Date(),
    },
  })

  await logOnboardingEvent(hotelId, 'onboarding_skipped')
}

/**
 * Log onboarding event
 */
export async function logOnboardingEvent(
  hotelId: string,
  event: string,
  step?: string,
  meta?: Record<string, any>,
  duration?: number
): Promise<void> {
  await prisma.onboardingLog.create({
    data: {
      hotelId,
      event,
      step,
      meta: meta || {},
      duration,
    },
  })
}

/**
 * Get onboarding analytics
 */
export async function getOnboardingAnalytics(hotelId: string) {
  const progress = await getOnboardingProgress(hotelId)
  const logs = await prisma.onboardingLog.findMany({
    where: { hotelId },
    orderBy: { createdAt: 'asc' },
  })

  const stepTimes: Record<string, number> = {}
  const events: Record<string, number> = {}

  logs.forEach((log) => {
    // Count events
    events[log.event] = (events[log.event] || 0) + 1

    // Track step durations
    if (log.step && log.duration) {
      stepTimes[log.step] = (stepTimes[log.step] || 0) + log.duration
    }
  })

  return {
    progress,
    logs,
    stepTimes,
    events,
    totalLogs: logs.length,
  }
}

/**
 * Generate widget key
 */
export async function generateWidgetKey(
  hotelId: string,
  userId: string,
  label?: string
): Promise<{ key: string; keyPrefix: string }> {
  // Generate random key
  const randomBytes = createHash('sha256')
    .update(`${hotelId}-${Date.now()}-${Math.random()}`)
    .digest('hex')

  const key = `wk_${randomBytes.substring(0, 32)}`
  const keyHash = createHash('sha256').update(key).digest('hex')
  const keyPrefix = key.substring(0, 12) // "wk_12345678"

  // Store hashed key
  await prisma.widgetKey.create({
    data: {
      hotelId,
      keyHash,
      keyPrefix,
      label,
      createdBy: userId,
    },
  })

  // Log event
  await logOnboardingEvent(hotelId, 'widget_key_generated', 'widget', {
    keyPrefix,
  })

  return { key, keyPrefix }
}

/**
 * Verify widget key
 */
export async function verifyWidgetKey(key: string): Promise<string | null> {
  const keyHash = createHash('sha256').update(key).digest('hex')

  const widget = await prisma.widgetKey.findUnique({
    where: { keyHash },
  })

  if (!widget || !widget.isActive) {
    return null
  }

  // Update usage stats
  await prisma.widgetKey.update({
    where: { id: widget.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  })

  return widget.hotelId
}

/**
 * Get widget keys for a hotel
 */
export async function getWidgetKeys(hotelId: string) {
  return prisma.widgetKey.findMany({
    where: { hotelId },
    orderBy: { createdAt: 'desc' },
  })
}
