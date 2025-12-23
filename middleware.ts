import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkAccess, getDefaultRedirectUrl, type UserContext, type UserRole } from '@/lib/access-control'

/**
 * Authentication Middleware for Multi-Tenant System
 *
 * Architecture:
 * - Admin/Owner: NextAuth JWT tokens (role: OWNER, ADMIN, MANAGER)
 * - Staff: Custom session tokens (role: STAFF)
 * - Guest: Custom session tokens (role: GUEST)
 *
 * Strict Role Enforcement:
 * 1. /admin/** routes:
 *    - Requires: NextAuth session with role in [OWNER, ADMIN, MANAGER]
 *    - Must have: hotelId in session (except /admin/register, /admin/login, /admin/onboarding)
 *    - Assertion: Admin operations MUST include hotelId
 *
 * 2. /staff/** routes:
 *    - Requires: staff-session cookie OR Bearer token
 *    - Must have: staffId in session token
 *    - Assertion: Staff operations MUST include staffId
 *
 * 3. /guest/** routes:
 *    - Requires: guest-session cookie OR sessionId param OR Bearer token
 *    - Must have: guestToken in session
 *    - Assertion: Guest operations MUST have valid session token
 *
 * Rules:
 * 1. Public routes bypass all auth checks
 * 2. Dashboard routes require auth + role validation
 * 3. No automatic redirects for unauthenticated users
 * 4. Return 401/403 errors (not 500)
 * 5. Log all auth failures with context
 * 6. Never depend on hotelId before auth
 * 7. Prevent cross-role access (admin cannot use staff token, etc.)
 * 8. Validate role-specific data (hotelId for admin, staffId for staff, guestToken for guest)
 */

/**
 * Logger utility for middleware
 */
function logAuth(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, any>
) {
  const timestamp = new Date().toISOString()
  const contextStr = context ? JSON.stringify(context) : ''
  console.log(`[${timestamp}] [AUTH-${level.toUpperCase()}] ${message} ${contextStr}`)
}

/**
 * Safely extract NextAuth session token
 * Returns null if session doesn't exist or is invalid
 */
async function getSessionSafely(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    return token
  } catch (error) {
    logAuth('warn', 'Failed to extract session token', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

/**
 * CRITICAL ASSERTION: Admin sessions MUST have hotelId
 * This prevents any admin operation without hotel context
 */
function assertAdminSession(session: any, pathname: string): boolean {
  if (!session || !session.sub) {
    logAuth('error', 'ASSERTION FAILED: No admin session found', { pathname })
    return false
  }

  const userRole = (session.role as string)?.toUpperCase() || 'UNKNOWN'
  const hotelId = session.hotelId as string | null

  // Special case: /admin/onboarding is allowed without hotelId (user just signed up)
  if (pathname.startsWith('/admin/onboarding')) {
    if (userRole !== 'OWNER') {
      logAuth('error', 'ASSERTION FAILED: Onboarding requires OWNER role', {
        pathname,
        actualRole: userRole
      })
      return false
    }
    return true
  }

  // All other admin routes MUST have hotelId
  if (!hotelId) {
    logAuth('error', 'ASSERTION FAILED: Admin route missing hotelId', {
      pathname,
      userId: session.sub,
      userRole
    })
    return false
  }

  // Verify admin role
  const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER']
  if (!allowedRoles.includes(userRole)) {
    logAuth('error', 'ASSERTION FAILED: Invalid admin role', {
      pathname,
      actualRole: userRole,
      allowedRoles
    })
    return false
  }

  return true
}

/**
 * CRITICAL ASSERTION: Staff routes MUST have valid staff token
 */
function assertStaffSession(request: NextRequest, pathname: string): boolean {
  const staffToken =
    request.cookies.get('staff-session')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!staffToken) {
    logAuth('error', 'ASSERTION FAILED: Staff route missing session token', {
      pathname,
      hasStaffCookie: !!request.cookies.get('staff-session'),
      hasAuthHeader: !!request.headers.get('authorization')
    })
    return false
  }

  return true
}

/**
 * CRITICAL ASSERTION: Guest routes MUST have valid guest token
 */
function assertGuestSession(request: NextRequest, pathname: string): boolean {
  const guestToken =
    request.cookies.get('guest-session')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.nextUrl.searchParams.get('sessionId')

  if (!guestToken) {
    logAuth('error', 'ASSERTION FAILED: Guest route missing session token', {
      pathname,
      hasGuestCookie: !!request.cookies.get('guest-session'),
      hasAuthHeader: !!request.headers.get('authorization'),
      hasSessionParam: !!request.nextUrl.searchParams.get('sessionId')
    })
    return false
  }

  return true
}

/**
 * Route classification helpers
 */
function isPublicRoute(pathname: string): boolean {
  // Rule 1: Allow public access to these routes
  const publicRoutes = [
    '/signup',           // Hotel admin signup
    '/access',           // QR role selection
    '/staff/activate',   // Staff activation
    '/guest/access',     // Guest identification
    '/admin/login',      // Admin login
    '/admin/register',   // Admin register
    '/staff/password',   // Staff password reset
    '/guest/identify',   // Guest alternative identify
    '/forgot-password',  // Password recovery
    '/reset-password',   // Password reset
    '/widget-demo',      // Widget demo
    '/403',              // Error pages
    '/404',
    '/500',
    '/_next',            // Next.js internal
    '/favicon.ico'       // Favicon
  ]

  return publicRoutes.some(route => pathname.startsWith(route))
}

function isDashboardRoute(pathname: string): boolean {
  // Rule 2: Dashboard routes require auth + role
  const dashboardRoutes = [
    '/dashboard',
    '/admin/dashboard',
    '/admin/onboarding',
    '/admin/',  // All admin routes
    '/profile',
    '/settings'
  ]

  return dashboardRoutes.some(route => pathname.startsWith(route))
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function isPublicApiRoute(pathname: string): boolean {
  const publicApiRoutes = [
    '/api/auth',         // NextAuth
    '/api/register',     // Hotel signup
    '/api/qr',           // QR access
    '/api/guest/access', // Guest session
    '/api/guest/validate',
    '/api/guest/session/create'
  ]

  return publicApiRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // ===== UNIFIED ACCESS CONTROL =====
    // Single source of truth for all routing decisions

    // 1. Get session for authenticated users
    let userContext: UserContext | null = null

    const sessionToken = await getSessionSafely(request)
    if (sessionToken?.sub) {
      userContext = {
        userId: sessionToken.sub as string,
        role: (sessionToken.role as UserRole) || 'GUEST',
        hotelId: sessionToken.hotelId as string | undefined,
        isAuthenticated: true,
      }
    } else {
      // Check for staff/guest custom tokens
      const staffToken = request.cookies.get('staff-session')?.value
      const guestToken = request.cookies.get('guest-session')?.value

      if (staffToken) {
        // Note: Full validation in API routes (no DB in middleware)
        userContext = {
          userId: 'staff-user',
          role: 'STAFF',
          isAuthenticated: true,
        }
      } else if (guestToken) {
        userContext = {
          userId: 'guest-user',
          role: 'GUEST',
          guestToken,
          isAuthenticated: true,
        }
      }
    }

    // 2. Check access using unified service
    let accessCheck: any
    try {
      accessCheck = await checkAccess(pathname, userContext)
    } catch (accessCheckError) {
      logAuth('error', 'Access check threw error, allowing public routes only', {
        pathname,
        error: accessCheckError instanceof Error ? accessCheckError.message : 'Unknown error',
      })
      
      // On error, only allow public routes
      const publicPaths = [
        /^\/$/,
        /^\/login/,
        /^\/register/,
        /^\/pricing/,
        /^\/features/,
        /^\/admin\/login/,
        /^\/admin\/register/,
        /^\/staff\/activate/,
        /^\/guest\/access/,
      ]
      
      if (!publicPaths.some(pattern => pattern.test(pathname))) {
        // Block non-public routes when database is unavailable
        return NextResponse.json(
          {
            error: 'Service Unavailable',
            message: 'Authentication service temporarily unavailable. Please try again.',
          },
          { status: 503 }
        )
      }
      
      return NextResponse.next()
    }

    if (!accessCheck.allowed) {
      logAuth('warn', 'Access denied', {
        pathname,
        reason: accessCheck.reason,
        role: userContext?.role,
        status: accessCheck.httpStatus,
      })

      // Return appropriate response
      if (accessCheck.redirectUrl) {
        // Note: NextResponse.redirect() doesn't support custom status codes in middleware
        // It will use 307/308 temporary redirect by default
        return NextResponse.redirect(new URL(accessCheck.redirectUrl, request.url))
      }

      const status = accessCheck.httpStatus || 403
      return NextResponse.json(
        {
          error: status === 401 ? 'Unauthorized' : 'Forbidden',
          message: accessCheck.reason || 'Access denied',
        },
        { status }
      )
    }

    logAuth('info', 'Access granted', {
      pathname,
      role: userContext?.role,
    })

    return NextResponse.next()
  } catch (error) {
    // Emergency fallback
    const { pathname } = request.nextUrl
    logAuth('error', 'Access control error', {
      pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Allow public routes through even on error
    const publicRoutes = [
      /^\/$/,
      /^\/login/,
      /^\/register/,
      /^\/pricing/,
      /^\/api\/auth/,
    ]

    if (publicRoutes.some((r) => r.test(pathname))) {
      return NextResponse.next()
    }

    // Block everything else
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Access control check failed',
      },
      { status: 500 }
    )
  }
}

// Configure which routes use this middleware
// IMPORTANT: Do NOT match public routes here
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
}
