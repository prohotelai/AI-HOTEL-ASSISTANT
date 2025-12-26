'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Settings, QrCode, Users, BarChart3, ShieldCheck } from 'lucide-react'
import { useAdminContext } from '@/lib/contexts/AdminContext'

/**
 * AdminHeader - SaaS Platform Level Navigation
 * 
 * STRICT ISOLATION:
 * - This component MUST ONLY be used in /admin/** routes
 * - Uses useAdminContext() - will throw if used outside /admin
 * - NEVER import or use PMS components
 * - NEVER import or use PMS contexts
 * - Displays SaaS-level branding and navigation
 */

interface AdminNavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  // Temporarily hidden until pages are migrated to /admin/*
  // { label: 'Hotel QR', href: '/admin/hotel-qr', icon: <QrCode className="w-4 h-4" /> },
  // { label: 'PMS Setup', href: '/admin/pms', icon: <Building2 className="w-4 h-4" /> },
  // { label: 'RBAC', href: '/admin/rbac', icon: <ShieldCheck className="w-4 h-4" /> },
  // { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
]

export default function AdminHeader() {
  const pathname = usePathname()
  
  // Use AdminContext - this will throw if used outside /admin routes
  const { userName, hotelName, isLoading } = useAdminContext()

  // GUARD: Ensure this component is only used on /admin routes (client-side only)
  if (typeof window !== 'undefined' && !pathname?.startsWith('/admin') && !pathname?.startsWith('/dashboard/admin')) {
    console.error('❌ CRITICAL: AdminHeader used outside /admin routes:', pathname)
    throw new Error('AdminHeader can only be used in /admin routes')
  }

  // Log dashboard activation ONCE on mount (not on every render)
  if (typeof window !== 'undefined') {
    const logKey = 'admin-header-logged'
    if (!sessionStorage.getItem(logKey)) {
      console.log('✅ ACTIVE DASHBOARD: ADMIN')
      sessionStorage.setItem(logKey, 'true')
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href) || false
  }

  if (isLoading) {
    return (
      <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="animate-pulse text-slate-500">Loading...</div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* SaaS Platform Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">{hotelName || 'SaaS Platform Control'}</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-2">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-white">{userName}</span>
              <span className="text-xs text-slate-400">Platform Admin</span>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {(userName?.charAt(0) || 'A').toUpperCase()}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button className="text-slate-300 hover:text-white text-2xl">☰</button>
          </div>
        </div>
      </div>
    </nav>
  )
}
