/**
 * Test Data Setup - Creates hotels for access control tests
 */

import { prisma } from '@/lib/prisma'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

export const STARTER_HOTEL_ID = 'hotel-starter-plan'
export const PRO_HOTEL_ID = 'hotel-pro-plan'
export const SUSPENDED_HOTEL_ID = 'hotel-suspended'

export async function setupTestData() {
  try {
    // Step 1: Delete all OnboardingProgress records for test hotels first
    // This is required because OnboardingProgress has a unique constraint on hotelId
    const testHotelIds = [STARTER_HOTEL_ID, PRO_HOTEL_ID, SUSPENDED_HOTEL_ID]
    
    for (const hotelId of testHotelIds) {
      await prisma.onboardingProgress.deleteMany({
        where: { hotelId },
      }).catch(() => {}) // Ignore errors if record doesn't exist
    }

    // Step 2: Delete test hotels (cascades should handle onboarding progress)
    await prisma.hotel.deleteMany({
      where: {
        id: {
          in: testHotelIds,
        },
      },
    }).catch(() => {}) // Ignore errors if records don't exist
  } catch (err) {
    console.error('Cleanup error:', err)
  }

  // Create STARTER plan hotel with PENDING onboarding
  const starterHotel = await prisma.hotel.create({
    data: {
      id: STARTER_HOTEL_ID,
      name: 'Starter Hotel',
      slug: 'starter-hotel',
      website: 'https://starter.example.com',
      subscriptionPlan: 'STARTER' as SubscriptionPlan,
      subscriptionStatus: 'ACTIVE' as SubscriptionStatus,
      onboardingProgress: {
        create: {
          status: 'PENDING',
          completedSteps: [],
          skippedSteps: [],
        },
      },
    },
  })

  // Create PRO plan hotel with COMPLETED onboarding
  const proHotel = await prisma.hotel.create({
    data: {
      id: PRO_HOTEL_ID,
      name: 'Pro Hotel',
      slug: 'pro-hotel',
      website: 'https://pro.example.com',
      subscriptionPlan: 'PRO' as SubscriptionPlan,
      subscriptionStatus: 'ACTIVE' as SubscriptionStatus,
      onboardingProgress: {
        create: {
          status: 'COMPLETED',
          completedSteps: ['welcome', 'hotel-details', 'knowledge-base'],
          skippedSteps: [],
          completedAt: new Date(),
        },
      },
    },
  })

  // Create SUSPENDED hotel
  const suspendedHotel = await prisma.hotel.create({
    data: {
      id: SUSPENDED_HOTEL_ID,
      name: 'Suspended Hotel',
      slug: 'suspended-hotel',
      website: 'https://suspended.example.com',
      subscriptionPlan: 'STARTER' as SubscriptionPlan,
      subscriptionStatus: 'EXPIRED' as SubscriptionStatus,
      onboardingProgress: {
        create: {
          status: 'COMPLETED',
          completedSteps: [],
          skippedSteps: [],
        },
      },
    },
  })

  console.log('✓ Test data created successfully')
  return { starterHotel, proHotel, suspendedHotel }
}

export async function cleanupTestData() {
  await prisma.hotel.deleteMany({
    where: {
      id: {
        in: [STARTER_HOTEL_ID, PRO_HOTEL_ID, SUSPENDED_HOTEL_ID],
      },
    },
  })
  console.log('✓ Test data cleaned up')
}
