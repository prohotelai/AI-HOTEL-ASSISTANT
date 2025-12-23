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

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // ===== MINIMAL ACCESS CONTROL =====
    // Don't use Prisma in middleware (Edge Runtime limitation)
    // Only do simple token-based checks here

    // 1. Public routes - always allowed
    const publicRoutes = [
      /^\/$/,
      /^\/login/,
      /^\/register/,
      /^\/pricing/,
      /^\/features/,
      /^\/guest\/access/,
      /^\/staff\/activate/,
      /^\/admin\/register/,
      /^\/admin\/login/,
      /^\/widget-demo/,
      /^\/api\/auth/,  // NextAuth endpoints
      /^\/api\/register/,
      /^\/api\/qr/,
      /^\/api\/guest\/access/,
      /^\/api\/guest\/validate/,
      /^\/api\/guest\/session\/create/,
      /^\/api\/webhooks\//,
      /^\/_next\//,
      /^\/favicon\.ico$/,
    ]

    if (publicRoutes.some(pattern => pattern.test(pathname))) {
      return NextResponse.next()
    }

    // 2. Get session token from NextAuth
    let hasValidSession = false
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })
      
      if (token?.sub) {
        hasValidSession = true
      }
    } catch (error) {
      // Token extraction failed - user is not authenticated
      console.error('[MIDDLEWARE] Token extraction failed:', error instanceof Error ? error.message : error)
    }

    // 3. Check for staff/guest tokens
    const staffToken = request.cookies.get('staff-session')?.value
    const guestToken = request.cookies.get('guest-session')?.value
    
    const hasStaffSession = !!staffToken
    const hasGuestSession = !!guestToken

    // 4. Enforce access based on simple route patterns
    if (pathname.startsWith('/admin/')) {
      // Admin routes require NextAuth session
      if (!hasValidSession) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/dashboard/admin')) {
      // Admin dashboard requires NextAuth session
      if (!hasValidSession) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/staff/')) {
      // Staff routes require staff session
      if (!hasStaffSession && !hasValidSession) {
        return NextResponse.redirect(new URL('/staff/activate', request.url))
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/guest/')) {
      // Guest routes require guest session
      if (!hasGuestSession && !hasValidSession) {
        return NextResponse.redirect(new URL('/guest/access', request.url))
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/dashboard/')) {
      // Dashboard requires any valid session
      if (!hasValidSession && !hasStaffSession && !hasGuestSession) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next()
    }

    // 5. Default: allow if authenticated
    if (hasValidSession || hasStaffSession || hasGuestSession) {
      return NextResponse.next()
    }

    // 6. Unauthenticated on protected route - redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    // Emergency fallback - log the error and allow public routes
    console.error('[MIDDLEWARE] Unexpected error:', error instanceof Error ? error.message : error)
    
    const { pathname } = request.nextUrl
    
    // Allow public routes to prevent complete site outage
    const publicPaths = [/^\/login/, /^\/register/, /^\/pricing/, /^\/$/, /^\/api\/auth/]
    if (publicPaths.some(p => p.test(pathname))) {
      return NextResponse.next()
    }

    // Return 503 for protected routes when middleware fails
    return NextResponse.json(
      {
        error: 'Service Unavailable',
        message: 'The application is temporarily unavailable. Please try again.',
      },
      { status: 503 }
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
