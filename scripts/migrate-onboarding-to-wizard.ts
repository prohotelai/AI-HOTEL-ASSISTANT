/**
 * Migration Script: Migrate Old Onboarding to New Wizard
 * 
 * Run this after deploying schema changes
 * 
 * Maps:
 * - onboardingCompleted = true → wizardStatus = COMPLETED
 * - onboardingCompleted = false → wizardStatus = IN_PROGRESS, wizardStep = 1
 * 
 * This is NOT a Prisma migration file, but a script to handle data migration
 */

import { prisma } from '@/lib/prisma'

async function migrateOnboardingToWizard() {
  console.log('🔄 Starting migration: onboardingCompleted → wizardStatus')

  try {
    // Step 1: Find all users with completed onboarding
    const completedUsers = await prisma.user.findMany({
      where: {
        onboardingCompleted: true,
        role: 'OWNER',
      },
      select: { id: true, hotelId: true },
    })

    console.log(`Found ${completedUsers.length} users with completed onboarding`)

    // Step 2: Migrate each user's hotel
    let migrated = 0
    let skipped = 0

    for (const user of completedUsers) {
      if (!user.hotelId) {
        console.warn(`⚠️  User ${user.id} has no hotel - skipping`)
        skipped++
        continue
      }

      try {
        const now = new Date()

        // Update hotel
        await prisma.hotel.update({
          where: { id: user.hotelId },
          data: {
            wizardStatus: 'COMPLETED',
            wizardStep: null,
            wizardCompletedAt: now,
          },
        })

        // Update user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            wizardStatus: 'COMPLETED',
            wizardStep: null,
            wizardCompletedAt: now,
          },
        })

        migrated++
        console.log(`✅ Migrated hotel ${user.hotelId}`)
      } catch (error) {
        console.error(`❌ Failed to migrate hotel ${user.hotelId}:`, error)
        skipped++
      }
    }

    // Step 3: Initialize wizard for hotels that never completed old onboarding
    const incompleteUsers = await prisma.user.findMany({
      where: {
        onboardingCompleted: false,
        role: 'OWNER',
      },
      select: { id: true, hotelId: true },
    })

    console.log(
      `Found ${incompleteUsers.length} users with incomplete onboarding`
    )

    for (const user of incompleteUsers) {
      if (!user.hotelId) {
        console.warn(`⚠️  User ${user.id} has no hotel - skipping`)
        skipped++
        continue
      }

      try {
        // Update hotel
        await prisma.hotel.update({
          where: { id: user.hotelId },
          data: {
            wizardStatus: 'IN_PROGRESS',
            wizardStep: 1,
          },
        })

        // Update user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            wizardStatus: 'IN_PROGRESS',
            wizardStep: 1,
          },
        })

        migrated++
        console.log(`✅ Initialized wizard for hotel ${user.hotelId}`)
      } catch (error) {
        console.error(`❌ Failed to initialize wizard for ${user.hotelId}:`, error)
        skipped++
      }
    }

    console.log(`\n📊 Migration Summary:`)
    console.log(`  ✅ Migrated: ${migrated}`)
    console.log(`  ⚠️  Skipped: ${skipped}`)
    console.log(`  Total: ${migrated + skipped}`)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateOnboardingToWizard().then(() => {
  console.log('\n✅ Migration complete!')
  process.exit(0)
})

