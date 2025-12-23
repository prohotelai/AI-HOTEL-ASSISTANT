/**
 * DEPRECATED: Use onboardingStepService.ts instead
 *
 * This file now re-exports from the hardened step service for backwards compatibility.
 * The original onboardingService.ts interface has been superseded by the new
 * state machine-based onboardingStepService.ts which implements:
 * - PENDING → IN_PROGRESS → COMPLETED state machine
 * - Skip and edit support
 * - Production-grade access control
 * - Proper state persistence
 */

export {
  initializeOnboarding,
  getOnboardingProgress,
  completeStep,
  skipStep,
  editStep,
  resumeOnboarding,
  canAccessStep,
  completeOnboarding,
  resetOnboarding,
  getNextStep,
  getResumeStep,
  type OnboardingProgressData,
  type OnboardingStepName,
  type StepResponse,
} from './onboardingStepService'

// Legacy type for backwards compatibility
export type OnboardingStep =
  | 'hotel-details'
  | 'room-config'
  | 'services-setup'
  | 'finish'

// Legacy interface for backwards compatibility (maps to new model)
export interface LegacyOnboardingProgressData {
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
