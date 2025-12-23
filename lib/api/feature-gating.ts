/**
 * API Feature Gating Helper
 * 
 * Enforces subscription plan-based feature restrictions on API endpoints.
 * All responses for disabled features return HTTP 403 with human-readable message.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export type Feature = 'ai-chat' | 'analytics' | 'custom-branding' | 'api-access' | 'pms-integration' | 'advanced-ticketing'

export interface FeatureGatingResult {
  allowed: boolean
  message?: string
}

/**
 * Maps features to required subscription plans
 */
const FEATURE_REQUIREMENTS: Record<Feature, string[]> = {
  'ai-chat': ['STARTER', 'PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'analytics': ['PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'custom-branding': ['PRO_PLUS', 'ENTERPRISE'],
  'api-access': ['ENTERPRISE'],
  'pms-integration': ['PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'advanced-ticketing': ['PRO', 'PRO_PLUS', 'ENTERPRISE'],
}

/**
 * Check if a feature is available for a hotel
 */
export async function checkFeatureAvailability(
  hotelId: string,
  feature: Feature
): Promise<FeatureGatingResult> {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    })

    if (!hotel) {
      return {
        allowed: false,
        message: 'Hotel not found',
      }
    }

    // Check subscription status
    if (hotel.subscriptionStatus !== 'ACTIVE') {
      return {
        allowed: false,
        message: `Feature unavailable: Subscription is ${hotel.subscriptionStatus.toLowerCase()}. Please renew your subscription.`,
      }
    }

    // Check if plan supports feature
    const requiredPlans = FEATURE_REQUIREMENTS[feature]
    if (!requiredPlans.includes(hotel.subscriptionPlan)) {
      const planName = hotel.subscriptionPlan
        .split('_')
        .map(part => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ')
      
      // Find minimum required plan
      const minimumPlan = requiredPlans[0]
      const minimumPlanName = minimumPlan
        .split('_')
        .map(part => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ')

      return {
        allowed: false,
        message: `Feature "${feature}" requires ${minimumPlanName} plan or higher. You have ${planName} plan. Upgrade your subscription to access this feature.`,
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Feature gating check failed:', error)
    return {
      allowed: false,
      message: 'Unable to verify feature availability',
    }
  }
}

/**
 * Middleware wrapper for feature gating
 * Returns 403 if feature is not available
 */
export async function requireFeature(hotelId: string, feature: Feature) {
  const result = await checkFeatureAvailability(hotelId, feature)
  
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Feature unavailable',
        message: result.message || 'This feature is not available on your subscription plan',
        feature,
      },
      { status: 403 }
    )
  }

  return null // Feature allowed, continue processing
}

/**
 * List all available features for a hotel
 */
export async function getAvailableFeatures(hotelId: string): Promise<Feature[]> {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    })

    if (!hotel || hotel.subscriptionStatus !== 'ACTIVE') {
      return []
    }

    const available: Feature[] = []
    for (const [feature, plans] of Object.entries(FEATURE_REQUIREMENTS)) {
      if (plans.includes(hotel.subscriptionPlan)) {
        available.push(feature as Feature)
      }
    }

    return available
  } catch {
    return []
  }
}
