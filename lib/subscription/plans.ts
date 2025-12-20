/**
 * SaaS Subscription Plan Definitions
 * Defines all plans, features, and limits for the AI Hotel Assistant platform
 */

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  PRO_PLUS = 'PRO_PLUS',
  ENTERPRISE_LITE = 'ENTERPRISE_LITE',
  ENTERPRISE_MAX = 'ENTERPRISE_MAX',
}

export type PlanFeature =
  | 'AI_CHAT'
  | 'VOICE_MODE'
  | 'KNOWLEDGE_BASE_ADVANCED'
  | 'WEBSITE_SCAN_DAILY'
  | 'TICKETS_UNLIMITED'
  | 'EMAIL_SUPPORT_PRIORITY'
  | 'AI_TRAINING_FULL'
  | 'PMS_INTEGRATION'
  | 'PMS_LEGACY_SYNC'
  | 'TASK_AUTOMATION'
  | 'ATTACHMENTS_COMMENTS'
  | 'ADVANCED_ANALYTICS'
  | 'ACTIVITY_LOGS_90_DAYS'
  | 'STAFF_CRM'
  | 'REAL_TIME_NOTIFICATIONS'
  | 'CUSTOM_TUNING'
  | 'PREDICTIVE_ANALYTICS'
  | 'UNLIMITED_STORAGE'
  | 'CUSTOM_INTEGRATIONS'
  | 'WHITE_LABEL'
  | 'DEDICATED_SLA'

export interface PlanLimits {
  aiMessagesPerMonth: number
  voiceMinutesPerMonth: number | 'unlimited'
  ticketsPerMonth: number | 'unlimited'
  storageGB: number | 'unlimited'
  websiteScanFrequency: 'weekly' | 'daily'
  activityLogRetentionDays: number | 'unlimited'
  maxRooms?: number
}

export interface PlanDefinition {
  id: SubscriptionPlan
  name: string
  price: number // in cents
  currency: string
  features: PlanFeature[]
  limits: PlanLimits
  description: string
  popular?: boolean
  stripePriceId?: string // Set in environment
}

export const PLAN_DEFINITIONS: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.STARTER]: {
    id: SubscriptionPlan.STARTER,
    name: 'Starter',
    price: 0,
    currency: 'USD',
    description: 'Perfect for small properties getting started with AI',
    features: ['AI_CHAT'],
    limits: {
      aiMessagesPerMonth: 100,
      voiceMinutesPerMonth: 0,
      ticketsPerMonth: 10,
      storageGB: 1,
      websiteScanFrequency: 'weekly',
      activityLogRetentionDays: 30,
    },
  },

  [SubscriptionPlan.PRO]: {
    id: SubscriptionPlan.PRO,
    name: 'Pro',
    price: 99900, // $999
    currency: 'USD',
    description: 'Full-featured AI assistant with PMS integration',
    popular: true,
    features: [
      'AI_CHAT',
      'VOICE_MODE',
      'KNOWLEDGE_BASE_ADVANCED',
      'WEBSITE_SCAN_DAILY',
      'TICKETS_UNLIMITED',
      'EMAIL_SUPPORT_PRIORITY',
      'AI_TRAINING_FULL',
      'PMS_INTEGRATION',
      'TASK_AUTOMATION',
      'ATTACHMENTS_COMMENTS',
      'ADVANCED_ANALYTICS',
      'ACTIVITY_LOGS_90_DAYS',
      'STAFF_CRM',
      'REAL_TIME_NOTIFICATIONS',
    ],
    limits: {
      aiMessagesPerMonth: 1000,
      voiceMinutesPerMonth: 'unlimited',
      ticketsPerMonth: 'unlimited',
      storageGB: 10,
      websiteScanFrequency: 'daily',
      activityLogRetentionDays: 90,
    },
  },

  [SubscriptionPlan.PRO_PLUS]: {
    id: SubscriptionPlan.PRO_PLUS,
    name: 'Pro Plus',
    price: 199900, // $1,999
    currency: 'USD',
    description: 'Advanced features with custom AI tuning',
    features: [
      'AI_CHAT',
      'VOICE_MODE',
      'KNOWLEDGE_BASE_ADVANCED',
      'WEBSITE_SCAN_DAILY',
      'TICKETS_UNLIMITED',
      'EMAIL_SUPPORT_PRIORITY',
      'AI_TRAINING_FULL',
      'PMS_INTEGRATION',
      'TASK_AUTOMATION',
      'ATTACHMENTS_COMMENTS',
      'ADVANCED_ANALYTICS',
      'ACTIVITY_LOGS_90_DAYS',
      'STAFF_CRM',
      'REAL_TIME_NOTIFICATIONS',
      'CUSTOM_TUNING',
    ],
    limits: {
      aiMessagesPerMonth: 3000,
      voiceMinutesPerMonth: 'unlimited',
      ticketsPerMonth: 'unlimited',
      storageGB: 50,
      websiteScanFrequency: 'daily',
      activityLogRetentionDays: 90,
    },
  },

  [SubscriptionPlan.ENTERPRISE_LITE]: {
    id: SubscriptionPlan.ENTERPRISE_LITE,
    name: 'Enterprise Lite',
    price: 299900, // $2,999
    currency: 'USD',
    description: 'Enterprise-grade features with predictive analytics',
    features: [
      'AI_CHAT',
      'VOICE_MODE',
      'KNOWLEDGE_BASE_ADVANCED',
      'WEBSITE_SCAN_DAILY',
      'TICKETS_UNLIMITED',
      'EMAIL_SUPPORT_PRIORITY',
      'AI_TRAINING_FULL',
      'PMS_INTEGRATION',
      'PMS_LEGACY_SYNC',
      'TASK_AUTOMATION',
      'ATTACHMENTS_COMMENTS',
      'ADVANCED_ANALYTICS',
      'PREDICTIVE_ANALYTICS',
      'STAFF_CRM',
      'REAL_TIME_NOTIFICATIONS',
      'CUSTOM_TUNING',
      'UNLIMITED_STORAGE',
      'CUSTOM_INTEGRATIONS',
      'WHITE_LABEL',
      'DEDICATED_SLA',
    ],
    limits: {
      aiMessagesPerMonth: 5000,
      voiceMinutesPerMonth: 'unlimited',
      ticketsPerMonth: 'unlimited',
      storageGB: 'unlimited',
      websiteScanFrequency: 'daily',
      activityLogRetentionDays: 'unlimited',
      maxRooms: 750,
    },
  },

  [SubscriptionPlan.ENTERPRISE_MAX]: {
    id: SubscriptionPlan.ENTERPRISE_MAX,
    name: 'Enterprise Max',
    price: 399900, // $3,999
    currency: 'USD',
    description: 'Maximum capacity for large hotel properties (750-1000 rooms)',
    features: [
      'AI_CHAT',
      'VOICE_MODE',
      'KNOWLEDGE_BASE_ADVANCED',
      'WEBSITE_SCAN_DAILY',
      'TICKETS_UNLIMITED',
      'EMAIL_SUPPORT_PRIORITY',
      'AI_TRAINING_FULL',
      'PMS_INTEGRATION',
      'PMS_LEGACY_SYNC',
      'TASK_AUTOMATION',
      'ATTACHMENTS_COMMENTS',
      'ADVANCED_ANALYTICS',
      'PREDICTIVE_ANALYTICS',
      'STAFF_CRM',
      'REAL_TIME_NOTIFICATIONS',
      'CUSTOM_TUNING',
      'UNLIMITED_STORAGE',
      'CUSTOM_INTEGRATIONS',
      'WHITE_LABEL',
      'DEDICATED_SLA',
    ],
    limits: {
      aiMessagesPerMonth: 10000,
      voiceMinutesPerMonth: 'unlimited',
      ticketsPerMonth: 'unlimited',
      storageGB: 'unlimited',
      websiteScanFrequency: 'daily',
      activityLogRetentionDays: 'unlimited',
      maxRooms: 1000,
    },
  },
}

/**
 * Check if a plan has access to a specific feature
 */
export function planHasFeature(plan: SubscriptionPlan, feature: PlanFeature): boolean {
  return PLAN_DEFINITIONS[plan].features.includes(feature)
}

/**
 * Get limits for a specific plan
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_DEFINITIONS[plan].limits
}

/**
 * Get all features for a plan
 */
export function getPlanFeatures(plan: SubscriptionPlan): PlanFeature[] {
  return PLAN_DEFINITIONS[plan].features
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Get minimum plan required for a feature
 */
export function getMinimumPlanForFeature(feature: PlanFeature): SubscriptionPlan | null {
  const plans = Object.values(SubscriptionPlan)
  
  for (const plan of plans) {
    if (planHasFeature(plan, feature)) {
      return plan
    }
  }
  
  return null
}

/**
 * Compare two plans (returns -1 if plan1 < plan2, 0 if equal, 1 if plan1 > plan2)
 */
export function comparePlans(plan1: SubscriptionPlan, plan2: SubscriptionPlan): number {
  const prices = {
    [SubscriptionPlan.STARTER]: 0,
    [SubscriptionPlan.PRO]: 1,
    [SubscriptionPlan.PRO_PLUS]: 2,
    [SubscriptionPlan.ENTERPRISE_LITE]: 3,
    [SubscriptionPlan.ENTERPRISE_MAX]: 4,
  }
  
  return prices[plan1] - prices[plan2]
}

/**
 * Check if upgrade is available
 */
export function canUpgradeTo(currentPlan: SubscriptionPlan, targetPlan: SubscriptionPlan): boolean {
  return comparePlans(targetPlan, currentPlan) > 0
}

/**
 * Get next plan in tier
 */
export function getNextPlan(currentPlan: SubscriptionPlan): SubscriptionPlan | null {
  const planOrder = [
    SubscriptionPlan.STARTER,
    SubscriptionPlan.PRO,
    SubscriptionPlan.PRO_PLUS,
    SubscriptionPlan.ENTERPRISE_LITE,
    SubscriptionPlan.ENTERPRISE_MAX,
  ]
  
  const currentIndex = planOrder.indexOf(currentPlan)
  if (currentIndex < planOrder.length - 1) {
    return planOrder[currentIndex + 1]
  }
  
  return null
}
