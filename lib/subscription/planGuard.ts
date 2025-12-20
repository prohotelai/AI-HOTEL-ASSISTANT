/**
 * Plan Guard Middleware
 * Validates subscription plan access for protected features
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanFeature, planHasFeature, getMinimumPlanForFeature, PLAN_DEFINITIONS } from './plans'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

export class PlanAccessError extends Error {
  constructor(
    message: string,
    public feature: PlanFeature,
    public currentPlan: SubscriptionPlan,
    public requiredPlan: SubscriptionPlan,
    public upgradeUrl: string = '/settings/billing'
  ) {
    super(message)
    this.name = 'PlanAccessError'
  }
}

/**
 * Check if hotel's subscription is active
 */
async function isSubscriptionActive(hotelId: string): Promise<boolean> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
    },
  })

  if (!hotel) return false

  // Check if subscription is active
  if (hotel.subscriptionStatus !== SubscriptionStatus.ACTIVE && 
      hotel.subscriptionStatus !== SubscriptionStatus.TRIALING) {
    return false
  }

  // Check expiry dates
  const now = new Date()
  
  if (hotel.subscriptionStatus === SubscriptionStatus.TRIALING) {
    if (hotel.trialEndsAt && hotel.trialEndsAt < now) {
      return false
    }
  }

  if (hotel.subscriptionEndsAt && hotel.subscriptionEndsAt < now) {
    return false
  }

  return true
}

/**
 * Middleware to check if plan has access to a feature
 */
export function withPlanFeature(feature: PlanFeature) {
  return function (handler: (req: NextRequest, context?: any) => Promise<Response>) {
    return async function (req: NextRequest, context?: any): Promise<Response> {
      try {
        // Get session
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Please login' },
            { status: 401 }
          )
        }

        const user = session.user as any

        if (!user.hotelId) {
          return NextResponse.json(
            { error: 'Unauthorized - No hotel associated' },
            { status: 403 }
          )
        }

        // Get hotel subscription
        const hotel = await prisma.hotel.findUnique({
          where: { id: user.hotelId },
          select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
            trialEndsAt: true,
          },
        })

        if (!hotel) {
          return NextResponse.json(
            { error: 'Hotel not found' },
            { status: 404 }
          )
        }

        // Check if subscription is active
        const active = await isSubscriptionActive(user.hotelId)
        if (!active) {
          return NextResponse.json(
            {
              error: 'Subscription Inactive',
              message: 'Your subscription has expired or is inactive',
              subscriptionStatus: hotel.subscriptionStatus,
              upgradeUrl: '/settings/billing',
            },
            { status: 402 } // Payment Required
          )
        }

        // Check if plan has feature
        if (!planHasFeature(hotel.subscriptionPlan as any, feature)) {
          const requiredPlan = getMinimumPlanForFeature(feature)
          const requiredPlanName = requiredPlan ? PLAN_DEFINITIONS[requiredPlan].name : 'higher tier'

          return NextResponse.json(
            {
              error: 'Upgrade Required',
              message: `This feature requires ${requiredPlanName} plan or higher`,
              feature,
              currentPlan: hotel.subscriptionPlan,
              requiredPlan,
              upgradeUrl: '/settings/billing',
            },
            { status: 402 } // Payment Required
          )
        }

        // Execute handler
        return await handler(req, context)
      } catch (error) {
        console.error('Plan feature middleware error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Middleware to check multiple features (user needs ANY of them)
 */
export function withAnyPlanFeature(features: PlanFeature[]) {
  return function (handler: (req: NextRequest, context?: any) => Promise<Response>) {
    return async function (req: NextRequest, context?: any): Promise<Response> {
      try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Please login' },
            { status: 401 }
          )
        }

        const user = session.user as any

        if (!user.hotelId) {
          return NextResponse.json(
            { error: 'Unauthorized - No hotel associated' },
            { status: 403 }
          )
        }

        const hotel = await prisma.hotel.findUnique({
          where: { id: user.hotelId },
          select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
          },
        })

        if (!hotel) {
          return NextResponse.json(
            { error: 'Hotel not found' },
            { status: 404 }
          )
        }

        // Check if subscription is active
        const active = await isSubscriptionActive(user.hotelId)
        if (!active) {
          return NextResponse.json(
            {
              error: 'Subscription Inactive',
              upgradeUrl: '/settings/billing',
            },
            { status: 402 }
          )
        }

        // Check if plan has any of the features
        let hasAccess = false
        for (const feature of features) {
          if (planHasFeature(hotel.subscriptionPlan as any, feature)) {
            hasAccess = true
            break
          }
        }

        if (!hasAccess) {
          return NextResponse.json(
            {
              error: 'Upgrade Required',
              message: 'This feature requires a higher plan',
              currentPlan: hotel.subscriptionPlan,
              upgradeUrl: '/settings/billing',
            },
            { status: 402 }
          )
        }

        return await handler(req, context)
      } catch (error) {
        console.error('Plan feature middleware error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Check feature access programmatically (for use in service layer)
 */
export async function checkFeatureAccess(
  hotelId: string,
  feature: PlanFeature
): Promise<{ hasAccess: boolean; reason?: string; requiredPlan?: SubscriptionPlan }> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  })

  if (!hotel) {
    return { hasAccess: false, reason: 'Hotel not found' }
  }

  const active = await isSubscriptionActive(hotelId)
  if (!active) {
    return { hasAccess: false, reason: 'Subscription inactive' }
  }

  if (!planHasFeature(hotel.subscriptionPlan as any, feature)) {
    const requiredPlan = getMinimumPlanForFeature(feature)
    return {
      hasAccess: false,
      reason: `Feature requires ${requiredPlan} plan or higher`,
      requiredPlan: requiredPlan || undefined,
    }
  }

  return { hasAccess: true }
}

/**
 * Get hotel's current subscription details
 */
export async function getHotelSubscription(hotelId: string) {
  return await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  })
}
