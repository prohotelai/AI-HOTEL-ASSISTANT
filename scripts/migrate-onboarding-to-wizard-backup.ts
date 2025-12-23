/**
 * Migration Script: Migrate Old Onboarding to New Wizard
 * 
 * NOTE: This script is disabled - the wizard and onboarding fields don't exist in database
 */

import { prisma } from '@/lib/prisma'

async function migrateOnboardingToWizard() {
  console.log('🔄 Migration: onboarding → wizard (SKIPPED - fields don\'t exist in database)')
}

// Run migration
migrateOnboardingToWizard().then(() => {
  console.log('\n✅ Migration complete!')
  process.exit(0)
})
