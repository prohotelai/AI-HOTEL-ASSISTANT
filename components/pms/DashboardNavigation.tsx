'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * DashboardNavigation - PMS Operations Level Navigation
 * 
 * STRICT ISOLATION:
 * - This component MUST NOT be used in /dashboard/admin/** routes
 * - Only for /dashboard/hotel/**, /dashboard/staff/**, /dashboard/guest/** routes
 * - Displays PMS-level branding and navigation
 */

interface NavItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

const navItems: NavItem[] = [
  { label: 'Admin Dashboard', href: '/dashboard/admin/pms', icon: '📊', roles: ['ADMIN'] },
  { label: 'Staff Tasks', href: '/dashboard/staff/tasks', icon: '✅', roles: ['STAFF', 'ADMIN'] },
  { label: 'My Bookings', href: '/dashboard/guest/bookings', icon: '📅', roles: ['GUEST', 'ADMIN'] },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📈', roles: ['ADMIN'] },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️', roles: ['ADMIN'] }
]

// Support navigation item (conditionally shown based on subscription)
const getSupportNavItem = (workspaceId: string): NavItem => ({
  label: '24/7 Support',
  href: `/dashboard/hotel/${workspaceId}/support`,
  icon: '💬',
  roles: ['ADMIN', 'MANAGER', 'STAFF', 'GUEST']
})

export default function DashboardNavigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // GUARD: Ensure this component is NOT used on /admin routes (client-side only)
  if (typeof window !== 'undefined' && pathname?.startsWith('/dashboard/admin')) {
    console.error('❌ CRITICAL: PMS DashboardNavigation used in /admin routes:', pathname)
    throw new Error('PMS DashboardNavigation cannot be used in /admin routes. Use AdminHeader instead.')
  }

  if (typeof window !== 'undefined') {
    console.log('✅ ACTIVE DASHBOARD: PMS')
  }

  const userRole = (session?.user?.role as string)?.toUpperCase() || 'GUEST'
  const hotelId = (session?.user as any)?.hotelId || 'default'
  const supportEnabled = (session?.user as any)?.hotel?.supportEnabled || false

  // Build navigation items with role filtering
  let visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  // Add support link if enabled (paid plan)
  if (supportEnabled) {
    const supportItem = getSupportNavItem(hotelId)
    if (supportItem.roles.includes(userRole)) {
      visibleItems = [...visibleItems, supportItem]
    }
  }

  const isActive = (href: string) => {
    return pathname?.startsWith(href) || false
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏨</span>
            <h1 className="text-xl font-bold text-gray-900">Hotel PMS</h1>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-gray-600">{session?.user?.name}</span>
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {(session?.user?.name?.charAt(0) || 'U').toUpperCase()}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button className="text-gray-600 hover:text-gray-900 text-2xl">☰</button>
          </div>
        </div>
      </div>
    </nav>
  )
}
