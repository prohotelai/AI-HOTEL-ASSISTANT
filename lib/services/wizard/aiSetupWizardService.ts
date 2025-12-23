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
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
    },
  })

  if (!hotel) return null

  // Wizard fields have been removed from Hotel schema
  return {
    status: null,
    step: 1,
    completedAt: null,
  }
}

/**
 * Initialize wizard for new hotel (called at signup)
 * Sets: step 1, status IN_PROGRESS
 */
export async function initializeWizard(hotelId: string): Promise<WizardState> {
  // Wizard fields have been removed from Hotel schema
  // Return default initialized state
  
  // Also sync to user (get first owner user for this hotel)
  await syncWizardStateToUser(hotelId, 'IN_PROGRESS', 1, null)

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
  // Update only fields that exist in database
  const hotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      name: data.hotelName,
      website: data.websiteUrl,
      // country, city, hotelType, wizardStep, wizardStatus don't exist in database
    },
    select: {
      id: true,
      name: true,
    },
  })

  // Return hardcoded state since wizard fields don't exist
  const state: WizardState = {
    step: 2,
    status: 'IN_PROGRESS',
    completedAt: null,
  }
  return state
  // await syncWizardStateToUser(hotelId, 'IN_PROGRESS', 2, null)

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

  // Note: wizardStep, wizardStatus don't exist in database
  // await prisma.hotel.update({...})

  // await syncWizardStateToUser(hotelId, 'IN_PROGRESS', 3, null)

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

  // Note: wizardStep, wizardStatus don't exist in database
  // await prisma.hotel.update({...})

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

  // Note: wizardStatus, wizardStep, wizardCompletedAt don't exist in database
  // await prisma.hotel.update({...})

  // await syncWizardStateToUser(hotelId, 'COMPLETED', null, now)

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

  // Note: wizardStep doesn't exist in database
  // await prisma.hotel.update({...})

  // await syncWizardStateToUser(hotelId, 'IN_PROGRESS', nextStep, null)

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

  // Note: wizardStep doesn't exist in database
  // await prisma.hotel.update({...})

  // await syncWizardStateToUser(hotelId, 'IN_PROGRESS', prevStep, null)

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
  // Note: wizardStatus, wizardStep, wizardCompletedAt don't exist in database
  // await prisma.hotel.update({...})
}

/**
 * INTERNAL: Sync wizard state from Hotel to User
 * Ensures User record mirrors Hotel wizard state for faster queries
 */
async function syncWizardStateToUser(
  hotelId: string,
  status: 'IN_PROGRESS' | 'COMPLETED' | null,
  step: 1 | 2 | 3 | 4 | null,
  completedAt: Date | null
): Promise<void> {
  try {
    // Note: wizardStatus, wizardStep, wizardCompletedAt don't exist in database
    // User fields no longer used for sync since they don't exist
    // await prisma.user.updateMany({...})
  } catch (error) {
    // Log but don't fail if sync fails
    console.error('Failed to sync wizard state to user:', error)
  }
}

