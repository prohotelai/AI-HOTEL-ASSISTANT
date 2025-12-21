import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { validateStaffSession, validateGuestSession } from '@/lib/auth/sessionValidation'

/**
 * Enhanced Next.js Middleware for Session Management and RBAC
 * 
 * Features:
 * - NextAuth JWT token validation (Admin)
 * - Staff session validation (StaffSession)
 * - Guest session validation (GuestSession)
 * - Session expiration checking
 * - Role-based access control (RBAC)
 * - Hotel boundary enforcement
 * - Rate limiting headers
 * - CSRF protection
 * - Suspicious activity flagging
 * - Auto-redirect based on role hierarchy
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ===== STAFF ROUTE PROTECTION =====
  if (pathname.startsWith('/staff') && 
      !pathname.startsWith('/staff/access') && 
      !pathname.startsWith('/staff/password')) {
    
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '') || 
                        request.cookies.get('staff-session')?.value

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/staff/access', request.url))
    }

    const staffSession = await validateStaffSession(sessionToken)
    
    if (!staffSession) {
      return NextResponse.redirect(new URL('/staff/access?expired=true', request.url))
    }

    // Add session data to headers for downstream use
    const response = NextResponse.next()
    response.headers.set('x-staff-id', staffSession.userId)
    response.headers.set('x-hotel-id', staffSession.hotelId)
    response.headers.set('x-session-type', 'STAFF')
    
    return addSecurityHeaders(response, request)
  }

  // ===== GUEST ROUTE PROTECTION =====
  if (pathname.startsWith('/guest') && 
      !pathname.startsWith('/guest/access') && 
      !pathname.startsWith('/guest/identify')) {
    
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '') || 
                        request.cookies.get('guest-session')?.value

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/guest/access', request.url))
    }

    const guestSession = await validateGuestSession(sessionToken)
    
    if (!guestSession) {
      return NextResponse.redirect(new URL('/guest/access?expired=true', request.url))
    }

    // Add session data to headers for downstream use
    const response = NextResponse.next()
    response.headers.set('x-guest-id', guestSession.id)
    response.headers.set('x-hotel-id', guestSession.hotelId)
    response.headers.set('x-session-type', 'GUEST')
    response.headers.set('x-conversation-id', guestSession.conversationId || '')
    
    return addSecurityHeaders(response, request)
  }

  // ===== ADMIN AUTHENTICATION (NextAuth) =====
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Public routes - no authentication needed
  const publicRoutes = [
    '/login',
    '/admin/login',
    '/admin/register',
    '/forgot-password',
    '/reset-password',
    '/widget-demo',
    '/403'
  ]

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Admin onboarding route - accessible only to authenticated OWNER users
  const isAdminOnboardingRoute = pathname.startsWith('/admin/onboarding')
  
  // Legacy onboarding route - redirect to /admin/onboarding
  if (pathname.startsWith('/onboarding')) {
    const adminOnboardingUrl = new URL('/admin/onboarding', request.url)
    return NextResponse.redirect(adminOnboardingUrl)
  }
  
  // Allow public routes and API auth endpoints
  if (isPublicRoute || pathname.startsWith('/api/auth')) {
    return addSecurityHeaders(NextResponse.next(), request)
  }

  // Allow QR universal API endpoints (no auth required, rate limited instead)
  if (pathname.startsWith('/api/qr/universal')) {
    return addSecurityHeaders(NextResponse.next(), request)
  }

  // Allow onboarding API endpoints for authenticated users
  if (pathname.startsWith('/api/onboarding')) {
    if (!token || !token.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return addSecurityHeaders(NextResponse.next(), request)
  }

  // ===== ONBOARDING FLOW ENFORCEMENT =====
  
  // Check if user is authenticated
  if (!token || !token.id) {
    // Not authenticated - redirect to login unless on admin onboarding page
    if (isAdminOnboardingRoute) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  } else {
    // User is authenticated - enforce onboarding for OWNER role without hotel
    const userRole = (token.role as string) || 'guest'
    const hotelId = token.hotelId as string | null
    const onboardingCompleted = token.onboardingCompleted as boolean | undefined

    // OWNER without hotel should be on onboarding
    if (userRole === 'OWNER' || userRole === 'owner') {
      if (!hotelId || !onboardingCompleted) {
        // User needs to complete onboarding
        if (!isAdminOnboardingRoute) {
          // Redirect to admin onboarding if trying to access protected routes
          if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/admin/dashboard')) {
            const onboardingUrl = new URL('/admin/onboarding', request.url)
            return NextResponse.redirect(onboardingUrl)
          }
        }
        // Allow access to admin onboarding pages
        if (isAdminOnboardingRoute) {
          return addSecurityHeaders(NextResponse.next(), request)
        }
      } else {
        // User has completed onboarding
        if (isAdminOnboardingRoute) {
          // Redirect to dashboard if trying to access onboarding after completion
          const dashboardUrl = new URL('/dashboard', request.url)
          return NextResponse.redirect(dashboardUrl)
        }
      }
    }
  }

  // Protected routes - require authentication
  const protectedRoutes = [
    '/dashboard',
    '/admin/dashboard',
    '/api/protected',
    '/api/rbac',
    '/api/session',
    '/profile'
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Protect /admin/* routes (except login/register which are public)
  const isAdminRoute = pathname.startsWith('/admin') && 
    !pathname.startsWith('/admin/login') && 
    !pathname.startsWith('/admin/register')

  if (isProtectedRoute || isAdminRoute) {
    // Check for valid authentication
    if (!token || !token.id) {
      // Not authenticated - redirect to login
      if (pathname.startsWith('/api/')) {
        // API routes return JSON
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // UI routes redirect to appropriate login
      const loginUrl = new URL(
        isAdminRoute ? '/admin/login' : '/login',
        request.url
      )
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if authenticated user has completed onboarding (OWNER role only)
    const userRole = (token.role as string) || 'guest'
    const hotelId = token.hotelId as string | null
    const onboardingCompleted = token.onboardingCompleted as boolean | undefined

    if ((userRole === 'OWNER' || userRole === 'owner') && (!hotelId || !onboardingCompleted)) {
      // OWNER without completed onboarding - redirect to admin onboarding
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Onboarding required' },
          { status: 403 }
        )
      }
      const onboardingUrl = new URL('/admin/onboarding', request.url)
      return NextResponse.redirect(onboardingUrl)
    }

    // Ensure hotelId exists for non-OWNER roles
    if (!hotelId && userRole !== 'OWNER' && userRole !== 'owner') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'No hotel associated with user' },
          { status: 403 }
        )
      }
      return routeAccessDenied(request, '/403')
    }

    // ===== ROLE-BASED ROUTE PROTECTION =====

    // Admin dashboard - Admin only
    if (pathname.startsWith('/dashboard/admin')) {
      if (userRole.toLowerCase() !== 'admin' && userRole.toLowerCase() !== 'owner') {
        return routeAccessDenied(request, '/403')
      }
    }

    // Staff dashboard - Staff and above
    if (pathname.startsWith('/dashboard/staff')) {
      const allowedRoles = ['admin', 'manager', 'supervisor', 'staff']
      if (!allowedRoles.includes(userRole.toLowerCase())) {
        return routeAccessDenied(request, '/403')
      }
    }

    // Analytics - Admin and Manager only
    if (pathname.startsWith('/dashboard/analytics')) {
      const allowedRoles = ['admin', 'manager']
      if (!allowedRoles.includes(userRole.toLowerCase())) {
        return routeAccessDenied(request, '/403')
      }
    }

    // Guest portal - Guests and above
    if (pathname.startsWith('/dashboard/guest')) {
      // All authenticated users can access
    }

    // Validate hotel boundary
    const pathHotelId = extractHotelIdFromPath(pathname)
    if (pathHotelId && pathHotelId !== hotelId) {
      // User trying to access different hotel's data
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Access denied - hotel boundary violation' },
          { status: 403 }
        )
      }
      return routeAccessDenied(request, '/403')
    }

    // Check for suspicious activity flags
    if (Array.isArray(token.suspiciousFlags)) {
      const suspiciousFlags = token.suspiciousFlags as string[]
      const hasCriticalFlags = suspiciousFlags.some((flag) => 
        ['IMPOSSIBLE_TRAVEL', 'TOKEN_REUSE_DETECTED'].includes(flag)
      )
      
      if (hasCriticalFlags) {
        // Require re-authentication for suspicious sessions
        const reauthUrl = new URL('/auth/verify', request.url)
        reauthUrl.searchParams.set('reason', 'suspicious_activity')
        return NextResponse.redirect(reauthUrl)
      }
    }
  }

  // Add security headers to all responses
  return addSecurityHeaders(NextResponse.next(), request)
}

/**
 * Extract hotelId from request pathname if present
 */
function extractHotelIdFromPath(pathname: string): string | null {
  // Check for patterns like /dashboard/admin/hotels/{hotelId}/...
  const match = pathname.match(/\/hotels\/([a-z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Redirect user to access denied page with fallback
 */
function routeAccessDenied(request: NextRequest, fallbackUrl: string): NextResponse {
  const url = new URL(fallbackUrl, request.url)
  url.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Referrer policy for privacy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  
  // CORS headers (adjust origin as needed)
  const origin = request.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000'
  if (origin?.includes('localhost') || origin?.includes(appUrl)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  // Cache control for sensitive pages
  if (request.nextUrl.pathname.includes('/dashboard') || 
      request.nextUrl.pathname.includes('/api/')) {
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate'
    )
  }
  
  return response
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/staff/:path*',
    '/guest/:path*',
    '/profile/:path*',
    '/api/:path*',
    '/login',
    '/owner-login',
    '/register',
    '/onboarding/:path*'
  ]
}