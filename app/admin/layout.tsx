import { ReactNode } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { AdminProvider } from '@/lib/contexts/AdminContext'

/**
 * AdminLayout - SaaS Platform Level Layout
 * 
 * STRICT ISOLATION:
 * - This layout applies to ALL /admin/** routes
 * - Uses AdminHeader instead of PMS DashboardNavigation
 * - Uses AdminProvider instead of PMSProvider
 * - NEVER shares components with PMS dashboard
 * 
 * Route Scope:
 * - /admin/dashboard/** (admin control center)
 * - /admin/(auth)/** (login/register - uses route group to exclude layout)
 */

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-slate-950">
        <AdminHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AdminProvider>
  )
}
