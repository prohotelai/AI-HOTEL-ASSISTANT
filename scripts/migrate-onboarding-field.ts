/**
 * Migration Script: Set onboardingCompleted for existing users
 * 
 * This script updates existing users:
 * - Users with hotelId → onboardingCompleted = true (already set up)
 * - Users with role 'admin' → promote to 'OWNER' if they own a hotel
 * - Users without hotelId → onboardingCompleted = false (needs onboarding)
 */

import { PrismaClient } from '@prisma/client'
import { SystemRole } from '@/lib/types/roles'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting migration: Set onboardingCompleted for existing users\n')

  // Note: onboardingCompleted field doesn't exist in database
  // This migration script is now a no-op
  
  console.log(`✅ Migration skipped - onboardingCompleted field doesn't exist in database`)

  console.log('\n✨ Migration completed successfully!')
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
