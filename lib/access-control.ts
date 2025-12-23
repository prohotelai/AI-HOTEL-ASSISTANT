/**
 * Unified Access Control Service
 * 
 * Single source of truth for all routing, access control, and feature gating decisions.
 * This service is used by middleware to determine:
 * - Whether a user can access a route
 * - Where to redirect them if not
 * - What features are available to them
 * - Whether specific API actions are allowed
 */

import { prisma } from '@/lib/prisma'

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'GUEST'

export interface UserContext {
  userId: string
  role: UserRole
  hotelId?: string
  staffId?: string
  guestToken?: string
  isAuthenticated: boolean
}

export interface AccessCheckResult {
  allowed: boolean
  redirectUrl?: string
  reason?: string
  httpStatus?: 401 | 403 | 404 | 303
}

export interface FeatureCheckResult {
  enabled: boolean
  reason?: string
}

/**
 * Get onboarding status for a hotel
 */
export async function getOnboardingStatus(hotelId: string): Promise<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null> {
  try {
    const progress = await prisma.onboardingProgress.findUnique({
      where: { hotelId },
      select: { status: true },
    })
    return progress?.status ?? null
  } catch {
    return null
  }
}

/**
 * Get hotel subscription and features
 */
export async function getHotelFeatures(hotelId: string) {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    })

    return {
      plan: hotel?.subscriptionPlan ?? 'STARTER',
      subscriptionActive: hotel?.subscriptionStatus === 'ACTIVE',
      enabledServices: {}, // Future: could be a separate table
    }
  } catch {
    return {
      plan: 'STARTER',
      subscriptionActive: false,
      enabledServices: {},
    }
  }
}

/**
 * PERMISSION MATRIX: Defines what each role can access
 */
const PERMISSION_MATRIX: Record<
  UserRole,
  {
    allowedRoutes: (string | RegExp)[]
    blockedRoutes: (string | RegExp)[]
    publicRoutes: (string | RegExp)[]
    requirements?: {
      onboardingRequired?: 'NONE' | 'PENDING' | 'COMPLETED'
      hotelIdRequired?: boolean
    }
  }
> = {
  OWNER: {
    allowedRoutes: [
      /^\/admin\//,
      /^\/dashboard\/admin/,
      /^\/api\/admin/,
      /^\/api\/hotel/,
      /^\/settings/,
    ],
    blockedRoutes: [/^\/staff\//, /^\/guest\//],
    publicRoutes: [],
    requirements: {
      onboardingRequired: 'COMPLETED',
      hotelIdRequired: true,
    },
  },
  ADMIN: {
    allowedRoutes: [
      /^\/admin\//,
      /^\/dashboard\/admin/,
      /^\/api\/admin/,
      /^\/api\/hotel/,
      /^\/settings/,
    ],
    blockedRoutes: [/^\/staff\//, /^\/guest\//],
    publicRoutes: [],
    requirements: {
      onboardingRequired: 'COMPLETED',
      hotelIdRequired: true,
    },
  },
  MANAGER: {
    allowedRoutes: [
      /^\/admin\/dashboard/,
      /^\/dashboard\/admin/,
      /^\/api\/admin\/read/,
      /^\/api\/hotel\/read/,
    ],
    blockedRoutes: [/^\/admin\/settings/, /^\/staff\//, /^\/guest\//],
    publicRoutes: [],
    requirements: {
      onboardingRequired: 'COMPLETED',
      hotelIdRequired: true,
    },
  },
  STAFF: {
    allowedRoutes: [
      /^\/staff\//,
      /^\/api\/staff/,
      /^\/api\/tickets/,
      /^\/api\/guests/,
    ],
    blockedRoutes: [/^\/admin\//, /^\/dashboard\/admin/, /^\/guest\//],
    publicRoutes: [/^\/staff\/password/],
    requirements: {
      hotelIdRequired: true,
    },
  },
  GUEST: {
    allowedRoutes: [
      /^\/guest\//,
      /^\/api\/guest/,
      /^\/api\/chat/,
    ],
    blockedRoutes: [/^\/admin\//, /^\/staff\//, /^\/dashboard\//],
    publicRoutes: [/^\/guest\/access/],
    requirements: {},
  },
}

/**
 * Feature Gating Rules: Define which features require which plans
 */
const FEATURE_PLAN_REQUIREMENTS: Record<string, string[]> = {
  'ai-chat': ['STARTER', 'PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'analytics': ['PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'custom-branding': ['PRO_PLUS', 'ENTERPRISE'],
  'api-access': ['ENTERPRISE'],
  'dedicated-support': ['ENTERPRISE'],
  'staff-management': ['STARTER', 'PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'guest-portal': ['STARTER', 'PRO', 'PRO_PLUS', 'ENTERPRISE'],
  'pms-integration': ['PRO', 'PRO_PLUS', 'ENTERPRISE'],
}

/**
 * Check if a route matches a route pattern
 */
function matchesRoute(pathname: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return pathname === pattern || pathname.startsWith(pattern)
    }
    return pattern.test(pathname)
  })
}

/**
 * Main access control function
 * Returns: Can user access? If not, where should they go?
 */
export async function checkAccess(
  pathname: string,
  userContext: UserContext | null
): Promise<AccessCheckResult> {
  // Public routes - always allowed
  const publicRoutes = [
    /^\/$/,
    /^\/login/,
    /^\/register/,
    /^\/pricing/,
    /^\/features/,
    /^\/guest\/access/,
    /^\/staff\/activate/,
    /^\/onboarding/,
    /^\/admin\/register/,
    /^\/admin\/login/,
    /^\/widget-demo/,
  ]

  if (matchesRoute(pathname, publicRoutes)) {
    return { allowed: true }
  }

  // Not authenticated
  if (!userContext || !userContext.isAuthenticated) {
    return {
      allowed: false,
      redirectUrl: '/login',
      httpStatus: 401,
      reason: 'Authentication required',
    }
  }

  const role = userContext.role
  const hotelId = userContext.hotelId
  const permissions = PERMISSION_MATRIX[role]

  if (!permissions) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Unknown role: ${role}`,
    }
  }

  // Check if route is in blocked routes
  if (matchesRoute(pathname, permissions.blockedRoutes)) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Role ${role} cannot access ${pathname}`,
    }
  }

  // Check if route is public for this role
  if (matchesRoute(pathname, permissions.publicRoutes)) {
    return { allowed: true }
  }

  // Check if route is in allowed routes
  if (!matchesRoute(pathname, permissions.allowedRoutes)) {
    return {
      allowed: false,
      httpStatus: 404,
      reason: `Route not found for role ${role}`,
    }
  }

  // Check hotel ID requirement
  if (permissions.requirements?.hotelIdRequired && !hotelId) {
    return {
      allowed: false,
      redirectUrl: '/login',
      httpStatus: 401,
      reason: 'Hotel context required',
    }
  }

  // CRITICAL: Admin routes require completed onboarding
  if (permissions.requirements?.onboardingRequired === 'COMPLETED') {
    // Skip check for onboarding routes themselves
    if (!pathname.startsWith('/admin/onboarding')) {
      const onboardingStatus = await getOnboardingStatus(hotelId!)
      
      if (onboardingStatus !== 'COMPLETED') {
        // Redirect to onboarding
        return {
          allowed: false,
          redirectUrl: '/admin/onboarding',
          httpStatus: 303,
          reason: 'Onboarding not completed',
        }
      }
    }
  }

  // If accessing onboarding but already completed, redirect away
  if (pathname.startsWith('/admin/onboarding')) {
    const onboardingStatus = await getOnboardingStatus(hotelId!)
    
    if (onboardingStatus === 'COMPLETED') {
      return {
        allowed: false,
        redirectUrl: '/dashboard/admin',
        httpStatus: 303,
        reason: 'Onboarding already completed',
      }
    }
  }

  return { allowed: true }
}

/**
 * Check if a specific feature is enabled
 */
export async function checkFeature(
  featureName: string,
  hotelId: string
): Promise<FeatureCheckResult> {
  const { plan, subscriptionActive, enabledServices } = await getHotelFeatures(hotelId)

  // Subscription must be active
  if (!subscriptionActive) {
    return {
      enabled: false,
      reason: 'Subscription not active',
    }
  }

  // Check plan requirements
  const requiredPlans = FEATURE_PLAN_REQUIREMENTS[featureName] ?? []
  if (requiredPlans.length > 0 && !requiredPlans.includes(plan)) {
    return {
      enabled: false,
      reason: `Feature requires ${requiredPlans.join(' or ')} plan`,
    }
  }

  // Check if enabled in hotel services
  if (enabledServices && !enabledServices[featureName as keyof typeof enabledServices]) {
    return {
      enabled: false,
      reason: `Feature not enabled for this hotel`,
    }
  }

  return { enabled: true }
}

/**
 * Get the appropriate redirect URL for a user based on their role and onboarding status
 * Used for login redirects and post-action redirects
 */
export async function getDefaultRedirectUrl(userContext: UserContext): Promise<string> {
  const role = userContext.role
  const hotelId = userContext.hotelId

  // Staff and guests have specific landing pages
  if (role === 'STAFF') {
    return '/staff/console'
  }

  if (role === 'GUEST') {
    return '/guest/chat'
  }

  // For admins, check onboarding status
  if ((role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER') && hotelId) {
    const onboardingStatus = await getOnboardingStatus(hotelId)

    if (onboardingStatus !== 'COMPLETED') {
      // Get the last incomplete step and redirect to it
      try {
        const progress = await prisma.onboardingProgress.findUnique({
          where: { hotelId },
          select: { currentStep: true, completedSteps: true },
        })

        if (progress?.currentStep) {
          return `/admin/onboarding?step=${progress.currentStep}`
        }
      } catch {
        // Fallback
      }

      return '/admin/onboarding'
    }

    return '/dashboard/admin'
  }

  // Default fallback
  return '/login'
}

/**
 * Validate that a user can perform a specific action
 * Used for API endpoint protection
 */
export async function validateAction(
  action: string,
  userContext: UserContext,
  targetHotelId: string
): Promise<AccessCheckResult> {
  const role = userContext.role
  const userHotelId = userContext.hotelId

  // Multi-tenant isolation: user can only act on their hotel
  if (userHotelId && userHotelId !== targetHotelId) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: 'Hotel mismatch',
    }
  }

  // Role-based action restrictions
  const adminActions = ['create_room', 'delete_room', 'invite_staff', 'delete_hotel', 'modify_subscription']
  const managerActions = ['create_room', 'invite_staff']
  const staffActions = ['create_ticket', 'update_ticket_status']

  if (adminActions.includes(action) && !['OWNER', 'ADMIN'].includes(role)) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Action ${action} requires admin role`,
    }
  }

  if (managerActions.includes(action) && !['OWNER', 'ADMIN', 'MANAGER'].includes(role)) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Action ${action} not allowed for ${role}`,
    }
  }

  if (staffActions.includes(action) && !['STAFF'].includes(role)) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Action ${action} requires staff role`,
    }
  }

  return { allowed: true }
}
