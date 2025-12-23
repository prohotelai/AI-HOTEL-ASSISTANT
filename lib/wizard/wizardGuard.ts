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
 * Check wizard status for a hotel
 * Returns whether wizard is completed and what the current step is
 */
export async function getWizardGuardStatus(
  hotelId: string
): Promise<WizardGuardResult> {
  // Note: wizardStatus and wizardStep don't exist in database
  // For now, always return wizard as not completed since we can't track state
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
    },
  })

  if (!hotel) {
    return {
      isCompleted: false,
      currentStep: 1,
      wizardUrl: '/admin/setup-wizard',
    }
  }

  return {
    isCompleted: false,
    currentStep: 1, // Since wizard state doesn't exist in database, always start at step 1
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

