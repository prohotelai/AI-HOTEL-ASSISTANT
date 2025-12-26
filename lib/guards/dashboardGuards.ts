/**
 * Dashboard Route Guards
 * 
 * CRITICAL SYSTEM SAFEGUARD:
 * Prevents cross-dashboard component usage that would cause
 * context conflicts, data leaks, and incorrect header rendering.
 * 
 * Architecture:
 * - Admin Dashboard (/dashboard/admin/*) uses AdminHeader, AdminProvider
 * - PMS Dashboard (/dashboard/hotel/*, /staff/*, /guest/*) uses DashboardNavigation, PMSProvider
 * - These must NEVER mix
 */

export enum DashboardType {
  ADMIN = 'ADMIN',
  PMS = 'PMS',
  UNKNOWN = 'UNKNOWN'
}

function normalizePath(pathname: string | undefined | null): string {
  return typeof pathname === 'string' ? pathname : ''
}

/**
 * Determine which dashboard type a route belongs to
 */
export function getDashboardType(pathname: string): DashboardType {
  const path = normalizePath(pathname)

  if (!path) {
    return DashboardType.UNKNOWN
  }

  if (path.startsWith('/dashboard/admin')) {
    return DashboardType.ADMIN
  }
  
  if (
    path.startsWith('/dashboard/hotel') ||
    path.startsWith('/dashboard/staff') ||
    path.startsWith('/dashboard/guest') ||
    path.startsWith('/dashboard/analytics')
  ) {
    return DashboardType.PMS
  }

  // /dashboard root or other dashboard routes default to PMS
  if (path.startsWith('/dashboard')) {
    return DashboardType.PMS
  }

  return DashboardType.UNKNOWN
}

/**
 * Assert that Admin components are only used in Admin routes
 * @throws Error if used in non-admin route
 */
export function assertAdminRoute(pathname: string, componentName: string): void {
  const dashboardType = getDashboardType(pathname)

  if (dashboardType !== DashboardType.ADMIN) {
    const error = `❌ CRITICAL: ${componentName} used outside /dashboard/admin routes. Current route: ${pathname}`
    console.error(error)
    throw new Error(`${componentName} can only be used in /dashboard/admin/** routes`)
  }

  console.log(`✅ ${componentName} correctly used in Admin route: ${pathname}`)
}

/**
 * Assert that PMS components are only used in PMS routes
 * @throws Error if used in admin route
 */
export function assertPMSRoute(pathname: string, componentName: string): void {
  const dashboardType = getDashboardType(pathname)

  if (dashboardType === DashboardType.ADMIN) {
    const error = `❌ CRITICAL: ${componentName} used in /dashboard/admin routes. Current route: ${pathname}`
    console.error(error)
    throw new Error(`${componentName} cannot be used in /dashboard/admin/** routes. Use Admin components instead.`)
  }

  console.log(`✅ ${componentName} correctly used in PMS route: ${pathname}`)
}

/**
 * Check if current route is Admin dashboard
 */
export function isAdminRoute(pathname: string): boolean {
  return getDashboardType(pathname) === DashboardType.ADMIN
}

/**
 * Check if current route is PMS dashboard
 */
export function isPMSRoute(pathname: string): boolean {
  return getDashboardType(pathname) === DashboardType.PMS
}

/**
 * Get appropriate dashboard label for logging
 */
export function getDashboardLabel(pathname: string): string {
  const type = getDashboardType(pathname)
  
  switch (type) {
    case DashboardType.ADMIN:
      return 'ADMIN DASHBOARD (SaaS Platform Level)'
    case DashboardType.PMS:
      return 'PMS DASHBOARD (Hotel Operations Level)'
    default:
      return 'UNKNOWN DASHBOARD'
  }
}

/**
 * Log dashboard context for debugging
 */
export function logDashboardContext(pathname: string): void {
  const label = getDashboardLabel(pathname)
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🏢 ${label} | Route: ${pathname}`)
}
