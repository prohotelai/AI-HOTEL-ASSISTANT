#!/usr/bin/env npx ts-node

/**
 * PRE-MIGRATION SAFETY CHECK
 * Detects duplicate Stripe identifiers before applying UNIQUE constraints
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DuplicateResult {
  value: string
  count: number
}

async function detectDuplicates() {
  console.log('🔍 STEP 1: DETECTING DUPLICATE STRIPE IDENTIFIERS\n')
  console.log('=' .repeat(60))

  try {
    // Detect duplicate stripeCustomerId
    console.log('\n📊 Checking stripeCustomerId duplicates...')
    const customerIdDuplicates = await prisma.$queryRaw<DuplicateResult[]>`
      SELECT "stripeCustomerId" as value, COUNT(*)::int AS count
      FROM "Hotel"
      WHERE "stripeCustomerId" IS NOT NULL
      GROUP BY "stripeCustomerId"
      HAVING COUNT(*) > 1
    `

    // Detect duplicate stripeSubscriptionId
    console.log('📊 Checking stripeSubscriptionId duplicates...')
    const subscriptionIdDuplicates = await prisma.$queryRaw<DuplicateResult[]>`
      SELECT "stripeSubscriptionId" as value, COUNT(*)::int AS count
      FROM "Hotel"
      WHERE "stripeSubscriptionId" IS NOT NULL
      GROUP BY "stripeSubscriptionId"
      HAVING COUNT(*) > 1
    `

    // Report findings
    console.log('\n' + '='.repeat(60))
    console.log('📋 DETECTION RESULTS:\n')

    if (customerIdDuplicates.length === 0 && subscriptionIdDuplicates.length === 0) {
      console.log('✅ DATABASE IS CLEAN')
      console.log('   No duplicate Stripe identifiers found.')
      console.log('   Safe to apply UNIQUE constraints.\n')
      return { needsCleanup: false, customerIdDuplicates: [], subscriptionIdDuplicates: [] }
    }

    console.log('⚠️  DUPLICATES DETECTED:\n')

    if (customerIdDuplicates.length > 0) {
      console.log(`❌ stripeCustomerId duplicates: ${customerIdDuplicates.length}`)
      customerIdDuplicates.forEach(dup => {
        console.log(`   - "${dup.value}": ${dup.count} hotels`)
      })
    } else {
      console.log('✅ stripeCustomerId: No duplicates')
    }

    if (subscriptionIdDuplicates.length > 0) {
      console.log(`\n❌ stripeSubscriptionId duplicates: ${subscriptionIdDuplicates.length}`)
      subscriptionIdDuplicates.forEach(dup => {
        console.log(`   - "${dup.value}": ${dup.count} hotels`)
      })
    } else {
      console.log('✅ stripeSubscriptionId: No duplicates')
    }

    console.log('\n⚠️  CLEANUP REQUIRED BEFORE MIGRATION\n')
    return { needsCleanup: true, customerIdDuplicates, subscriptionIdDuplicates }

  } catch (error) {
    console.error('❌ ERROR during duplicate detection:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute
detectDuplicates()
  .then(result => {
    if (result.needsCleanup) {
      console.log('🛠️  Run cleanup script next: npm run db:cleanup-duplicates')
      process.exit(1) // Exit with error code to prevent migration
    } else {
      console.log('✅ Ready to proceed with migration')
      process.exit(0)
    }
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
