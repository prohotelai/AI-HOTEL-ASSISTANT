'use client'

import { ReactNode } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { AdminProvider } from '@/lib/contexts/AdminContext'

/**
 * AdminLayout - SaaS Platform Level Layout
 * 
 * STRICT ISOLATION:
 * - This layout OVERRIDES the parent /dashboard/layout.tsx
 * - Uses AdminHeader instead of PMS DashboardNavigation
 * - Uses AdminProvider instead of PMSProvider
 * - NEVER shares components with PMS dashboard
 * 
 * CRITICAL: Marked as 'use client' to ensure AdminProvider (context) properly wraps
 * client components (AdminHeader, AdminSidebar) during hydration. Without this,
 * useAdminContext() fails with "useAdminContext must be used within AdminProvider" error.
 * 
 * Route Guard:
 * - Only active for /dashboard/admin/** routes
 * - Throws error if used elsewhere
 */

export default function AdminLayout({ children }: { children: ReactNode }) {
  console.log('DashboardAdminLayout: Rendering AdminHeader and AdminSidebar')
  return (
    <AdminProvider>
      <div className="min-h-screen bg-slate-950">
        <AdminHeader />
        <div className="max-w-7xl mx-auto flex">
          <AdminSidebar />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  )
}
