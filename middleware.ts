import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * SAFE Middleware for Multi-Tenant Auth System
 * 
 * Critical Rules:
 * - Public routes MUST bypass all auth checks
 * - Never access session.user without null checks
 * - Never throw errors - return safe defaults
 * - Staff/Guest validation happens in API routes (not middleware)
 * 
 * Architecture:
 * - Admin: NextAuth JWT tokens
 * - Staff: Custom session tokens (validated in API routes)
 * - Guest: Custom session tokens (validated in API routes)
 */

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
    console.error('Session extraction error:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // ===== 1. PUBLIC ROUTES - IMMEDIATE BYPASS =====
    // These routes MUST be accessible without authentication
    const publicRoutes = [
      '/admin/login',
      '/admin/register',
      '/signup',
      '/login',
      '/staff/access',
      '/staff/password',
      '/guest/access',
      '/guest/identify',
      '/forgot-password',
      '/reset-password',
      '/widget-demo',
      '/api/auth',
      '/403',
      '/500',
      '/404',
      '/_next',
      '/favicon.ico'
    ]

    // Check if current path is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    
    if (isPublicRoute) {
      return NextResponse.next()
    }

    // ===== 2. STAFF ROUTES - TOKEN CHECK ONLY =====
    // Full validation happens in API routes (Prisma not available in Edge Runtime)
    if (pathname.startsWith('/staff/')) {
      const staffToken = request.cookies.get('staff-session')?.value || 
                        request.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!staffToken) {
        return NextResponse.redirect(new URL('/staff/access', request.url))
      }
      
      // Token exists - let through, API routes will validate
      return NextResponse.next()
    }

    // ===== 3. GUEST ROUTES - TOKEN CHECK ONLY =====
    if (pathname.startsWith('/guest/')) {
      const guestToken = request.cookies.get('guest-session')?.value || 
                        request.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!guestToken) {
        return NextResponse.redirect(new URL('/guest/access', request.url))
      }
      
      // Token exists - let through, API routes will validate
      return NextResponse.next()
    }

    // ===== 4. ADMIN ROUTES - NEXTAUTH VALIDATION =====
    
    // Allow QR universal API (no auth required)
    if (pathname.startsWith('/api/qr/universal')) {
      return NextResponse.next()
    }

    // Get session safely (never throws)
    const session = await getSessionSafely(request)

    // Protected routes require authentication
    const protectedRoutes = [
      '/dashboard',
      '/admin/dashboard',
      '/admin/onboarding',
      '/profile',
      '/settings',
      '/api/protected',
      '/api/rbac',
      '/api/session'
    ]

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAdminRoute = pathname.startsWith('/admin/') && 
                         !pathname.startsWith('/admin/login') && 
                         !pathname.startsWith('/admin/register')
    const isApiRoute = pathname.startsWith('/api/')

    // Check if route requires authentication
    if (isProtectedRoute || isAdminRoute) {
      // No session - redirect to login
      if (!session || !session.id) {
        // Prevent redirect loop
        if (pathname === '/admin/login') {
          return NextResponse.next()
        }

        // API routes return 401
        if (isApiRoute) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
        
        // UI routes redirect to login
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Session exists - check onboarding for OWNER role
      const userRole = (session.role as string)?.toUpperCase() || 'GUEST'
      const hotelId = session.hotelId as string | null
      const onboardingCompleted = session.onboardingCompleted as boolean | undefined

      // OWNER without completed onboarding must complete it first
      if (userRole === 'OWNER' && (!hotelId || !onboardingCompleted)) {
        const isOnboardingRoute = pathname.startsWith('/admin/onboarding')
        
        if (!isOnboardingRoute) {
          // Redirect to onboarding
          if (isApiRoute) {
            return NextResponse.json(
              { error: 'Onboarding required' },
              { status: 403 }
            )
          }
          const onboardingUrl = new URL('/admin/onboarding', request.url)
          return NextResponse.redirect(onboardingUrl)
        }
      }

      // Completed onboarding - redirect away from onboarding page
      if (userRole === 'OWNER' && hotelId && onboardingCompleted) {
        if (pathname.startsWith('/admin/onboarding')) {
          const dashboardUrl = new URL('/dashboard', request.url)
          return NextResponse.redirect(dashboardUrl)
        }
      }

      // Check role-based access for admin routes
      if (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/onboarding')) {
        if (userRole !== 'OWNER' && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
          if (isApiRoute) {
            return NextResponse.json(
              { error: 'Access denied' },
              { status: 403 }
            )
          }
          return NextResponse.redirect(new URL('/403', request.url))
        }
      }
    }

    // Legacy route redirects
    if (pathname === '/owner-login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (pathname === '/register') {
      return NextResponse.redirect(new URL('/admin/register', request.url))
    }
    if (pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/admin/onboarding', request.url))
    }

    // Allow through
    return NextResponse.next()

  } catch (error) {
    // NEVER throw in middleware - log and allow through for public routes
    console.error('Middleware error:', error)
    
    const { pathname } = request.nextUrl
    
    // Allow public routes even on error
    const emergencyPublicRoutes = [
      '/admin/login',
      '/admin/register',
      '/signup',
      '/login',
      '/staff/access',
      '/guest/access',
      '/api/auth'
    ]
    
    const isEmergencyPublic = emergencyPublicRoutes.some(route => pathname.startsWith(route))
    
    if (isEmergencyPublic) {
      return NextResponse.next()
    }
    
    // For protected routes, redirect to login on error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    
    return NextResponse.redirect(new URL('/admin/login', request.url))
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
