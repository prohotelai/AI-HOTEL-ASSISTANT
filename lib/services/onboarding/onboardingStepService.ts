/**
 * HARDENED Onboarding Step Service
 * 
 * Core principles:
 * 1. Each step is ISOLATED - saves independently to domain model
 * 2. Progress is STATE MACHINE - PENDING → IN_PROGRESS → COMPLETED
 * 3. Steps are SKIPPABLE and RESUMABLE - no dead ends
 * 4. Bidirectional navigation - go back and edit previous steps
 * 5. No in-memory state - server is source of truth
 */

import { prisma } from '@/lib/prisma'
import type { OnboardingStatus } from '@prisma/client'

export type OnboardingStepName =
  | 'hotel-details'
  | 'room-config'
  | 'services-setup'
  | 'finish'

export interface OnboardingProgressData {
  hotelId: string
  status: OnboardingStatus
  currentStep: string | null
  completedSteps: string[]
  skippedSteps: string[]
  totalTimeSpent: number
  completedAt: Date | null
  updatedAt: Date
}

export interface StepResponse {
  success: boolean
  stepStatus: 'completed' | 'skipped' | 'pending'
  currentStep: string | null
  nextStep: string | null
  completedSteps: string[]
  skippedSteps: string[]
  progress: OnboardingProgressData
  errorMessage?: string
}

// Define the wizard step order
const STEP_ORDER: OnboardingStepName[] = [
  'hotel-details',
  'room-config',
  'services-setup',
  'finish',
]

/**
 * Initialize onboarding progress for a new hotel
 * IDEMPOTENT - safe to call multiple times
 */
export async function initializeOnboarding(
  hotelId: string
): Promise<OnboardingProgressData> {
  // Upsert pattern - update if exists, create if not
  const progress = await prisma.onboardingProgress.upsert({
    where: { hotelId },
    update: {
      // No changes if already exists
    },
    create: {
      hotelId,
      status: 'PENDING' as OnboardingStatus,
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
    },
  })

  return serializeProgress(progress)
}

/**
 * Get current onboarding progress
 * Returns null if never started
 */
export async function getOnboardingProgress(
  hotelId: string
): Promise<OnboardingProgressData | null> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
  })

  if (!progress) return null

  return serializeProgress(progress)
}

/**
 * Determine next allowed step based on completed steps
 */
export function getNextStep(
  completedSteps: string[],
  skippedSteps: string[]
): OnboardingStepName | null {
  // Find first step not in completed or skipped
  for (const step of STEP_ORDER) {
    if (!completedSteps.includes(step) && !skippedSteps.includes(step)) {
      return step
    }
  }

  return null // All steps completed or skipped
}

/**
 * Get last accessible step (for resume)
 * Returns the step admin should resume from
 */
export function getResumeStep(
  completedSteps: string[],
  skippedSteps: string[]
): OnboardingStepName {
  // If nothing completed, start at first step
  if (completedSteps.length === 0) {
    return STEP_ORDER[0]
  }

  // Find last completed step and resume from next
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
    if (completedSteps.includes(STEP_ORDER[i])) {
      // Resume from next step if available
      if (i + 1 < STEP_ORDER.length) {
        return STEP_ORDER[i + 1]
      }
      // Otherwise restart at this step to edit it
      return STEP_ORDER[i]
    }
  }

  return STEP_ORDER[0]
}

/**
 * Sync registration step to User model
 * Updates User.registrationStep to current step for state persistence
 */
async function syncRegistrationStepToUser(
  hotelId: string,
  stepName: OnboardingStepName,
  status: OnboardingStatus
): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: { hotelId },
      data: {
        registrationStep: stepName,
        registrationStatus: status,
      },
    })
  } catch (error) {
    // Log but don't fail if sync fails - onboarding progress is still updated
    console.error('Failed to sync registration step to User:', error)
  }
}

/**
 * Mark a step as COMPLETED
 * - Updates domain data is expected to happen BEFORE calling this
 * - This function only marks progress
 */
export async function completeStep(
  hotelId: string,
  stepName: OnboardingStepName
): Promise<StepResponse> {
  const progress = await getOnboardingProgress(hotelId)

  if (!progress) {
    throw new Error(`Onboarding not initialized for hotel ${hotelId}`)
  }

  const completedSteps = progress.completedSteps
  const skippedSteps = progress.skippedSteps

  // Idempotent - safe to complete same step multiple times
  if (!completedSteps.includes(stepName)) {
    completedSteps.push(stepName)
  }

  // Remove from skipped if it was skipped before
  const updatedSkipped = skippedSteps.filter((s) => s !== stepName)

  const nextStep = getNextStep(completedSteps, updatedSkipped)
  const isFinished = nextStep === null

  // Update progress
  const updated = await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: (isFinished ? 'COMPLETED' : 'IN_PROGRESS') as OnboardingStatus,
      currentStep: stepName,
      completedSteps,
      skippedSteps: updatedSkipped,
      completedAt: isFinished ? new Date() : null,
      updatedAt: new Date(),
    },
  })

  // Sync to User model for persistence
  const nextStepForSync = isFinished ? null : nextStep
  await syncRegistrationStepToUser(
    hotelId,
    nextStepForSync || stepName,
    (isFinished ? 'COMPLETED' : 'IN_PROGRESS') as OnboardingStatus
  )

  return {
    success: true,
    stepStatus: 'completed',
    currentStep: stepName,
    nextStep: nextStep,
    completedSteps,
    skippedSteps: updatedSkipped,
    progress: serializeProgress(updated),
  }
}

/**
 * Mark a step as SKIPPED
 * - Allows admin to skip a step and continue
 * - Can be resumed later from dashboard
 */
export async function skipStep(
  hotelId: string,
  stepName: OnboardingStepName
): Promise<StepResponse> {
  const progress = await getOnboardingProgress(hotelId)

  if (!progress) {
    throw new Error(`Onboarding not initialized for hotel ${hotelId}`)
  }

  const completedSteps = progress.completedSteps
  const skippedSteps = progress.skippedSteps

  // Idempotent - safe to skip same step multiple times
  if (!skippedSteps.includes(stepName)) {
    skippedSteps.push(stepName)
  }

  // Remove from completed if it was completed before
  const updatedCompleted = completedSteps.filter((s) => s !== stepName)

  const nextStep = getNextStep(updatedCompleted, skippedSteps)
  const isFinished = nextStep === null

  // Update progress
  const updated = await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: (isFinished ? 'COMPLETED' : 'IN_PROGRESS') as OnboardingStatus,
      currentStep: stepName,
      completedSteps: updatedCompleted,
      skippedSteps,
      completedAt: isFinished ? new Date() : null,
      updatedAt: new Date(),
    },
  })

  // Sync to User model for persistence
  const nextStepForSync = isFinished ? null : nextStep
  await syncRegistrationStepToUser(
    hotelId,
    nextStepForSync || stepName,
    (isFinished ? 'COMPLETED' : 'IN_PROGRESS') as OnboardingStatus
  )

  return {
    success: true,
    stepStatus: 'skipped',
    currentStep: stepName,
    nextStep: nextStep,
    completedSteps: updatedCompleted,
    skippedSteps,
    progress: serializeProgress(updated),
  }
}

/**
 * Edit a previously completed step
 * - Allows going BACK to edit and re-complete
 * - Keeps step in completed list
 */
export async function editStep(
  hotelId: string,
  stepName: OnboardingStepName
): Promise<OnboardingProgressData> {
  const progress = await getOnboardingProgress(hotelId)

  if (!progress) {
    throw new Error(`Onboarding not initialized for hotel ${hotelId}`)
  }

  // Move to IN_PROGRESS if was COMPLETED
  const updated = await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: 'IN_PROGRESS' as OnboardingStatus,
      currentStep: stepName,
      completedAt: null, // Reset completion
      updatedAt: new Date(),
    },
  })

  return serializeProgress(updated)
}

/**
 * Resume onboarding from last incomplete step
 * - Gets last accessible step
 * - Useful for "Continue Onboarding" button on dashboard
 */
export async function resumeOnboarding(
  hotelId: string
): Promise<OnboardingStepName> {
  const progress = await getOnboardingProgress(hotelId)

  if (!progress) {
    await initializeOnboarding(hotelId)
    return STEP_ORDER[0]
  }

  const resumeStep = getResumeStep(
    progress.completedSteps,
    progress.skippedSteps
  )

  // Update current step
  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      currentStep: resumeStep,
      status: 'IN_PROGRESS' as OnboardingStatus,
      updatedAt: new Date(),
    },
  })

  return resumeStep
}

/**
 * Check if step can be accessed
 * - Cannot access steps after wizard is COMPLETED
 * - Can access any step while IN_PROGRESS
 */
export async function canAccessStep(
  hotelId: string,
  stepName: OnboardingStepName
): Promise<boolean> {
  const progress = await getOnboardingProgress(hotelId)

  if (!progress) {
    // Not started - can access first step
    return stepName === STEP_ORDER[0]
  }

  // Cannot access any step after COMPLETED
  if (progress.status === 'COMPLETED') {
    return false
  }

  // While IN_PROGRESS, can access any step
  if (progress.status === 'IN_PROGRESS') {
    return true
  }

  // PENDING - only access first step
  return stepName === STEP_ORDER[0]
}

/**
 * Mark onboarding as COMPLETED
 * - Final state - wizard is locked
 * - Cannot go back or edit
 */
export async function completeOnboarding(
  hotelId: string
): Promise<StepResponse> {
  const progress = await getOnboardingProgress(hotelId)

  if (!progress) {
    throw new Error(`Onboarding not initialized for hotel ${hotelId}`)
  }

  const updated = await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: 'COMPLETED' as OnboardingStatus,
      currentStep: 'finish',
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  return {
    success: true,
    stepStatus: 'completed',
    currentStep: 'finish',
    nextStep: null,
    completedSteps: progress.completedSteps,
    skippedSteps: progress.skippedSteps,
    progress: serializeProgress(updated),
  }
}

/**
 * Reset onboarding progress (for testing only)
 */
export async function resetOnboarding(hotelId: string): Promise<void> {
  await prisma.onboardingProgress.upsert({
    where: { hotelId },
    update: {
      status: 'PENDING' as OnboardingStatus,
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
      completedAt: null,
      totalTimeSpent: 0,
    },
    create: {
      hotelId,
      status: 'PENDING' as OnboardingStatus,
    },
  })
}

/**
 * Internal helper - serialize Prisma model to typed interface
 */
function serializeProgress(data: any): OnboardingProgressData {
  return {
    hotelId: data.hotelId,
    status: data.status as OnboardingStatus,
    currentStep: data.currentStep,
    completedSteps: Array.isArray(data.completedSteps)
      ? (data.completedSteps as string[])
      : [],
    skippedSteps: Array.isArray(data.skippedSteps)
      ? (data.skippedSteps as string[])
      : [],
    totalTimeSpent: data.totalTimeSpent || 0,
    completedAt: data.completedAt,
    updatedAt: data.updatedAt,
  }
}
