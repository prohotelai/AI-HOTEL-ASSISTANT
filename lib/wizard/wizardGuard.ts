/**
 * Wizard Guard Helper
 * 
 * Checks if user has completed the AI Setup Wizard
 * Used for redirecting and showing dashboard locking
 */

import { prisma } from '@/lib/prisma'

export interface WizardGuardResult {
  isCompleted: boolean
  currentStep: 1 | 2 | 3 | 4 | null
  wizardUrl: string
}

/**
 * Check wizard status for a hotel using OnboardingProgress table
 * Returns whether wizard is completed and what the current step is
 */
export async function getWizardGuardStatus(
  hotelId: string
): Promise<WizardGuardResult> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
    select: {
      status: true,
      currentStep: true,
    },
  })

  // If no progress record, wizard not started
  if (!progress) {
    return {
      isCompleted: false,
      currentStep: null,
      wizardUrl: '/admin/setup-wizard',
    }
  }

  // Parse current step from string format ("step1" -> 1)
  let step: 1 | 2 | 3 | 4 | null = null
  if (progress.currentStep) {
    const stepNum = parseInt(progress.currentStep.replace('step', ''), 10)
    if (stepNum >= 1 && stepNum <= 4) {
      step = stepNum as 1 | 2 | 3 | 4
    }
  }

  return {
    isCompleted: progress.status === 'COMPLETED',
    currentStep: step,
    wizardUrl: '/admin/setup-wizard',
  }
}

/**
 * Check if user can access dashboard (wizard must be completed)
 */
export async function canAccessDashboard(hotelId: string): Promise<boolean> {
  const guard = await getWizardGuardStatus(hotelId)
  return guard.isCompleted
}

/**
 * Get redirect URL if user is trying to access dashboard before wizard completion
 */
export function getDashboardRedirectUrl(
  wizardGuardStatus: WizardGuardResult
): string | null {
  if (!wizardGuardStatus.isCompleted) {
    return wizardGuardStatus.wizardUrl
  }
  return null
}

