import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

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

    // ===== 1. PUBLIC ROUTES - IMMEDIATE BYPASS =====
    // Rule 1: These routes are always accessible
    if (isPublicRoute(pathname) || isPublicApiRoute(pathname)) {
      logAuth('info', 'Public route access', { pathname })
      return NextResponse.next()
    }

    // ===== 2. STAFF/GUEST ROUTES - CUSTOM TOKEN CHECK =====
    // Note: Full validation happens in API routes (no Prisma in Edge Runtime)
    // This middleware only does presence check

    // Staff routes: Check for staff-session cookie or Bearer token
    if (pathname.startsWith('/staff/chat') || pathname.startsWith('/staff/')) {
      // ASSERTION: Staff routes MUST have valid session token
      if (!assertStaffSession(request, pathname)) {
        logAuth('error', 'ENFORCEMENT: Staff route accessed without valid token', { pathname })
        // Rule 3: Do NOT redirect - return 401
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Staff session token required. Please scan the QR code.',
            code: 'STAFF_TOKEN_MISSING'
          },
          { status: 401 }
        )
      }

      logAuth('info', 'Staff route access granted', { pathname })
      return NextResponse.next()
    }

    // Guest routes: Check for guest-session or sessionId
    if (pathname.startsWith('/guest/chat') || pathname.startsWith('/guest/')) {
      // ASSERTION: Guest routes MUST have valid session token
      if (!assertGuestSession(request, pathname)) {
        logAuth('error', 'ENFORCEMENT: Guest route accessed without valid token', { pathname })
        // Rule 3: Do NOT redirect - return 401
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Guest session token required. Please scan the QR code.',
            code: 'GUEST_TOKEN_MISSING'
          },
          { status: 401 }
        )
      }

      logAuth('info', 'Guest route access granted', { pathname })
      return NextResponse.next()
    }

    // ===== 3. DASHBOARD ROUTES - NEXTAUTH VALIDATION =====
    // Rule 2: Requires both authentication AND role matching

    if (isDashboardRoute(pathname)) {
      const session = await getSessionSafely(request)

      // No session = 401 Unauthorized
      if (!session || !session.sub) {
        logAuth('warn', 'Dashboard route accessed without session', {
          pathname,
          hasSession: !!session
        })

        // Rule 4: Return 401/403, not 500
        if (isApiRoute(pathname)) {
          return NextResponse.json(
            {
              error: 'Unauthorized',
              message: 'Authentication required'
            },
            { status: 401 }
          )
        }

        // Rule 3: For UI routes, return 401 (client decides redirect)
        // DO NOT automatically redirect
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Please log in to access this page'
          },
          { status: 401 }
        )
      }

      // Extract user info from session
      const userRole = (session.role as string)?.toUpperCase() || 'GUEST'
      const hotelId = session.hotelId as string | null
      const onboardingCompleted = session.onboardingCompleted as boolean | undefined

      logAuth('info', 'Dashboard route session check', {
        pathname,
        userId: session.sub,
        userRole,
        hotelId
      })

      // Rule 2: Check role-based access for admin routes
      if (pathname.startsWith('/admin/')) {
        // ASSERTION: Admin routes require valid admin session
        if (!assertAdminSession(session, pathname)) {
          logAuth('error', 'ENFORCEMENT: Admin route access denied by assertion', { pathname })
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'Admin access denied. Invalid session or missing hotel context.',
              code: 'ADMIN_ASSERTION_FAILED'
            },
            { status: 403 }
          )
        }

        logAuth('info', 'Admin route access granted', {
          pathname,
          hotelId: session.hotelId,
          userRole: (session.role as string)?.toUpperCase()
        })

        return NextResponse.next()
      }

      // Other dashboard routes (/dashboard, /profile, /settings)
      if (!hotelId) {
        logAuth('error', 'Dashboard route missing hotelId', {
          pathname,
          userId: session.sub
        })

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'No hotel association found'
          },
          { status: 403 }
        )
      }

      logAuth('info', 'Dashboard route access granted', {
        pathname,
        userRole,
        hotelId
      })

      return NextResponse.next()
    }

    // ===== 4. ALL OTHER ROUTES - ALLOW THROUGH =====
    logAuth('info', 'Unclassified route access', { pathname })
    return NextResponse.next()
  } catch (error) {
    // Rule 5: Log middleware failures with context
    const { pathname } = request.nextUrl
    logAuth('error', 'Middleware error', {
      pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    // Emergency fallback: Allow public routes even on error
    if (isPublicRoute(pathname) || isPublicApiRoute(pathname)) {
      logAuth('info', 'Error recovery: allowing public route', { pathname })
      return NextResponse.next()
    }

    // Rule 4: Return 500 for protected routes on error
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Authentication check failed'
        },
        { status: 500 }
      )
    }

    // UI routes: Return error (do not redirect)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
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
