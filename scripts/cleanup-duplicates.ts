#!/usr/bin/env npx ts-node

/**
 * SAFE DUPLICATE CLEANUP
 * Resolves duplicate Stripe identifiers by keeping the canonical (oldest) hotel
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface HotelWithStripe {
  id: string
  name: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  createdAt: Date
}

async function cleanupDuplicates() {
  console.log('🧹 STEP 2: CLEANING UP DUPLICATES\n')
  console.log('=' .repeat(60))

  try {
    let totalCleaned = 0

    // Find all duplicate stripeCustomerId values
    const customerIdDuplicates = await prisma.$queryRaw<{ value: string }[]>`
      SELECT "stripeCustomerId" as value
      FROM "Hotel"
      WHERE "stripeCustomerId" IS NOT NULL
      GROUP BY "stripeCustomerId"
      HAVING COUNT(*) > 1
    `

    // Clean each duplicate stripeCustomerId
    for (const dup of customerIdDuplicates) {
      console.log(`\n🔧 Processing stripeCustomerId: "${dup.value}"`)
      
      // Get all hotels with this stripeCustomerId, ordered by creation date
      const hotels = await prisma.hotel.findMany({
        where: { stripeCustomerId: dup.value },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          createdAt: true
        }
      })

      if (hotels.length <= 1) continue

      const canonical = hotels[0]
      const duplicates = hotels.slice(1)

      console.log(`   ✅ Canonical (keeping): ${canonical.name} (${canonical.id})`)
      console.log(`      Created: ${canonical.createdAt.toISOString()}`)

      // Nullify duplicates
      for (const hotel of duplicates) {
        console.log(`   🔄 Cleaning: ${hotel.name} (${hotel.id})`)
        await prisma.hotel.update({
          where: { id: hotel.id },
          data: { stripeCustomerId: null }
        })
        totalCleaned++
      }
    }

    // Find all duplicate stripeSubscriptionId values
    const subscriptionIdDuplicates = await prisma.$queryRaw<{ value: string }[]>`
      SELECT "stripeSubscriptionId" as value
      FROM "Hotel"
      WHERE "stripeSubscriptionId" IS NOT NULL
      GROUP BY "stripeSubscriptionId"
      HAVING COUNT(*) > 1
    `

    // Clean each duplicate stripeSubscriptionId
    for (const dup of subscriptionIdDuplicates) {
      console.log(`\n🔧 Processing stripeSubscriptionId: "${dup.value}"`)
      
      const hotels = await prisma.hotel.findMany({
        where: { stripeSubscriptionId: dup.value },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          createdAt: true
        }
      })

      if (hotels.length <= 1) continue

      const canonical = hotels[0]
      const duplicates = hotels.slice(1)

      console.log(`   ✅ Canonical (keeping): ${canonical.name} (${canonical.id})`)
      console.log(`      Created: ${canonical.createdAt.toISOString()}`)

      for (const hotel of duplicates) {
        console.log(`   🔄 Cleaning: ${hotel.name} (${hotel.id})`)
        await prisma.hotel.update({
          where: { id: hotel.id },
          data: { stripeSubscriptionId: null }
        })
        totalCleaned++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ CLEANUP COMPLETE\n')
    console.log(`📊 Total fields cleaned: ${totalCleaned}`)
    console.log('✅ PMS data untouched')
    console.log('✅ Billing history preserved')
    console.log('✅ No hotel records deleted\n')

    return totalCleaned

  } catch (error) {
    console.error('❌ ERROR during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute
cleanupDuplicates()
  .then(cleaned => {
    console.log('🎯 Run verification next: npm run db:detect-duplicates')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
