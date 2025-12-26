'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  QrCode,
  Building2,
  Settings,
  Users,
  ShieldCheck,
  Database,
  Webhook,
  FileText,
} from 'lucide-react'

/**
 * AdminSidebar - Secondary navigation for Admin Dashboard
 * 
 * STRICT ISOLATION:
 * - This component MUST ONLY be used in /admin/** routes (and legacy /dashboard/admin/**)
 * - NEVER import or use PMS components
 */

interface SidebarItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Hotel QR Code', href: '/admin/hotel-qr', icon: <QrCode className="w-5 h-5" /> },
  { label: 'PMS Configuration', href: '/admin/pms', icon: <Building2 className="w-5 h-5" /> },
  { label: 'RBAC & Permissions', href: '/admin/rbac', icon: <ShieldCheck className="w-5 h-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
]

export default function AdminSidebar() {
  const pathname = usePathname() || ''

  // GUARD: Ensure this component is only used on admin routes (client-side only)
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard/admin')

  if (typeof window !== 'undefined' && !isAdminRoute) {
    console.error('❌ CRITICAL: AdminSidebar used outside admin routes:', pathname)
    // Soft failure: avoid crashing the page; render nothing
    return null
  }

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href) || false
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-6">
      <div className="space-y-2">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive(item.href)
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Admin Info Panel */}
      <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Admin Panel</h3>
        <p className="text-xs text-slate-500">
          You are viewing the SaaS platform administration dashboard. Changes here affect hotel-level operations.
        </p>
      </div>
    </aside>
  )
}
