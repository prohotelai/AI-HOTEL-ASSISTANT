/**
 * Migration Script: Set onboardingCompleted for existing users
 * 
 * This script updates existing users:
 * - Users with hotelId → onboardingCompleted = true (already set up)
 * - Users with role 'admin' → promote to 'OWNER' if they own a hotel
 * - Users without hotelId → onboardingCompleted = false (needs onboarding)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting migration: Set onboardingCompleted for existing users\n')

  // Update users with hotelId - they've already completed setup
  const usersWithHotel = await prisma.user.updateMany({
    where: {
      hotelId: { not: null },
      onboardingCompleted: false,
    },
    data: {
      onboardingCompleted: true,
    }
  })

  console.log(`✅ Updated ${usersWithHotel.count} users with hotels to onboardingCompleted = true`)

  // Update users with role 'admin' to 'OWNER' if they own/manage a hotel
  const adminUsers = await prisma.user.findMany({
    where: {
      role: 'admin',
      hotelId: { not: null },
    },
    select: {
      id: true,
      email: true,
      hotelId: true,
    }
  })

  console.log(`\n📋 Found ${adminUsers.length} admin users with hotels`)

  for (const user of adminUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'OWNER',
        onboardingCompleted: true,
      }
    })
    console.log(`  ✓ Promoted ${user.email} to OWNER`)
  }

  // Report on users without hotels
  const usersWithoutHotel = await prisma.user.count({
    where: {
      hotelId: null,
    }
  })

  console.log(`\n⚠️  ${usersWithoutHotel} users without hotels (will need to complete onboarding)`)

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
