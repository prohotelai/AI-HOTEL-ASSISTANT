/**
 * AI Setup Wizard Service
 * 
 * NEW 4-Step wizard that replaces the old complex onboarding flow
 * 
 * Purpose:
 * - Get hotel identity & context (Step 1)
 * - Scan website for knowledge (Step 2 - automatic)
 * - Review and enrich knowledge (Step 3)
 * - Test AI and build confidence (Step 4)
 * 
 * Design Principles:
 * 1. Persistent state stored on Hotel + User models
 * 2. Resumable across refresh, back button, new tab, new session
 * 3. No duplicate wizard instances per user
 * 4. Non-blocking - each step is independent
 * 5. Fast time-to-value: User interacts with AI within 2-3 minutes
 * 
 * Database Model:
 * - Hotel.wizardStatus: "IN_PROGRESS" | "COMPLETED" | null
 * - Hotel.wizardStep: 1 | 2 | 3 | 4 | null
 * - Hotel.wizardCompletedAt: timestamp | null
 * - User.wizardStatus: Mirror of Hotel (for faster access)
 * - User.wizardStep: Mirror of Hotel
 * - User.wizardCompletedAt: Mirror of Hotel
 */

import { prisma } from '@/lib/prisma'

export interface WizardState {
  status: 'IN_PROGRESS' | 'COMPLETED' | null
  step: 1 | 2 | 3 | 4 | null
  completedAt: Date | null
}

export interface WizardStep1Data {
  hotelName: string
  country: string
  city: string
  hotelType: string // "Hotel" | "Boutique" | "Aparthotel"
  websiteUrl?: string
}

export interface WizardStep2Result {
  extractedAmenities: string[]
  extractedServices: string[]
  extractedFaqs: { question: string; answer: string }[]
  scannedUrl?: string
}

export interface WizardStep3Data {
  knowledge: string // User's enriched knowledge (text)
  confirmedItems: string[]
  uploadedFiles?: { name: string; content: string }[]
}

export interface WizardStep4Feedback {
  testQuestions: string[] // Questions the user tested
  feedbackGiven: number // Count of "improve answer" feedback
  satisfactionScore?: number // 1-5
}

/**
 * Get current wizard state for a hotel
 * Returns null if wizard never started
 */
export async function getWizardState(hotelId: string): Promise<WizardState | null> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
    select: {
      status: true,
      currentStep: true,
      completedAt: true,
    },
  })

  if (!progress) return null

  // Map OnboardingProgress to WizardState
  // currentStep is stored as string like "step1", "step2", etc.
  let step: 1 | 2 | 3 | 4 | null = null
  if (progress.currentStep) {
    const stepNum = parseInt(progress.currentStep.replace('step', ''), 10)
    if (stepNum >= 1 && stepNum <= 4) {
      step = stepNum as 1 | 2 | 3 | 4
    }
  }

  return {
    status: progress.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
    step,
    completedAt: progress.completedAt,
  }
}

/**
 * Initialize wizard for new hotel (called at signup)
 * Sets: step 1, status IN_PROGRESS
 */
export async function initializeWizard(hotelId: string): Promise<WizardState> {
  // Create or update OnboardingProgress
  const progress = await prisma.onboardingProgress.upsert({
    where: { hotelId },
    update: {
      status: 'IN_PROGRESS',
      currentStep: 'step1',
      completedAt: null,
    },
    create: {
      hotelId,
      status: 'IN_PROGRESS',
      currentStep: 'step1',
    },
  })

  return {
    status: 'IN_PROGRESS',
    step: 1,
    completedAt: null,
  }
}

/**
 * Complete step 1: Hotel Information
 * Persists hotel details and moves to step 2
 */
export async function completeStep1(
  hotelId: string,
  data: WizardStep1Data
): Promise<WizardState> {
  // Update hotel details
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      name: data.hotelName,
      website: data.websiteUrl || null,
    },
  })

  // Update wizard progress
  await prisma.onboardingProgress.upsert({
    where: { hotelId },
    update: {
      status: 'IN_PROGRESS',
      currentStep: 'step2',
      completedSteps: ['step1'],
    },
    create: {
      hotelId,
      status: 'IN_PROGRESS',
      currentStep: 'step2',
      completedSteps: ['step1'],
    },
  })

  return {
    status: 'IN_PROGRESS',
    step: 2,
    completedAt: null,
  }
}

/**
 * Complete step 2: Web Scan (automatic)
 * In real implementation, this would scan the website and extract knowledge
 * For MVP, just moves to step 3
 */
export async function completeStep2(
  hotelId: string,
  scannedUrl?: string
): Promise<WizardState> {
  // TODO: Implement website scanning logic
  // For now, just move to step 3

  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: 'IN_PROGRESS',
      currentStep: 'step3',
      completedSteps: ['step1', 'step2'],
    },
  })

  return {
    status: 'IN_PROGRESS',
    step: 3,
    completedAt: null,
  }
}

/**
 * Complete step 3: Knowledge Base Review
 * User confirms/enriches extracted knowledge
 * Moves to step 4
 */
export async function completeStep3(
  hotelId: string,
  data: WizardStep3Data
): Promise<WizardState> {
  // TODO: Store confirmed knowledge in knowledge base
  // For now, just move to step 4

  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: 'IN_PROGRESS',
      currentStep: 'step4',
      completedSteps: ['step1', 'step2', 'step3'],
    },
  })

  return {
    status: 'IN_PROGRESS',
    step: 4,
    completedAt: null,
  }
}

/**
 * Complete step 4 and finish wizard
 * Marks wizard as COMPLETED
 * Unlocks dashboard access
 */
export async function completeStep4(
  hotelId: string,
  feedback: WizardStep4Feedback
): Promise<WizardState> {
  const now = new Date()

  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      status: 'COMPLETED',
      currentStep: null,
      completedSteps: ['step1', 'step2', 'step3', 'step4'],
      completedAt: now,
    },
  })

  return {
    status: 'COMPLETED',
    step: null,
    completedAt: now,
  }
}

/**
 * Resume wizard from current step
 * Called when user returns to /admin/setup-wizard
 */
export async function resumeWizard(hotelId: string): Promise<WizardState> {
  const state = await getWizardState(hotelId)

  if (!state) {
    // Wizard never started - initialize it
    return initializeWizard(hotelId)
  }

  if (state.status === 'COMPLETED') {
    // User shouldn't be accessing wizard - will be redirected by guard
    return state
  }

  // Return current state to resume from
  return state
}

/**
 * Skip to next step (allows users to skip optional steps)
 */
export async function skipToNextStep(hotelId: string): Promise<WizardState> {
  const state = await getWizardState(hotelId)

  if (!state || state.status === 'COMPLETED') {
    throw new Error('Cannot skip - wizard not in progress')
  }

  if (!state.step) {
    throw new Error('Invalid wizard step')
  }

  let nextStep: 1 | 2 | 3 | 4 | null
  if (state.step === 4) {
    // Can't skip from last step - must complete
    throw new Error('Cannot skip final step')
  } else {
    nextStep = (state.step + 1) as 1 | 2 | 3 | 4
  }

  const progress = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
    select: { completedSteps: true, skippedSteps: true },
  })

  const completedSteps = (progress?.completedSteps as string[]) || []
  const skippedSteps = (progress?.skippedSteps as string[]) || []
  skippedSteps.push(`step${state.step}`)

  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      currentStep: `step${nextStep}`,
      skippedSteps,
    },
  })

  return {
    status: 'IN_PROGRESS',
    step: nextStep,
    completedAt: null,
  }
}

/**
 * Go back to previous step (allows editing)
 */
export async function goToPreviousStep(hotelId: string): Promise<WizardState> {
  const state = await getWizardState(hotelId)

  if (!state || state.status === 'COMPLETED' || !state.step) {
    throw new Error('Cannot go back - invalid wizard state')
  }

  const prevStep = state.step > 1 ? (state.step - 1) as 1 | 2 | 3 | 4 : 1

  await prisma.onboardingProgress.update({
    where: { hotelId },
    data: {
      currentStep: `step${prevStep}`,
    },
  })

  return {
    status: 'IN_PROGRESS',
    step: prevStep,
    completedAt: null,
  }
}

/**
 * Migrate old onboarding status to new wizard status
 * Called during data migration
 * IF onboarding_completed = true → wizard_status = COMPLETED
 */
export async function migrateFromOldOnboarding(hotelId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { hotelId },
    select: { id: true },
  })

  if (!user) {
    return // No migration needed
  }

  // User exists - mark wizard as complete
  const now = new Date()
  await prisma.onboardingProgress.upsert({
    where: { hotelId },
    update: {
      status: 'COMPLETED',
      currentStep: null,
      completedAt: now,
    },
    create: {
      hotelId,
      status: 'COMPLETED',
      currentStep: null,
      completedAt: now,
    },
  })
}

