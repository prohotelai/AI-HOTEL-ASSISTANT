import { ReactNode } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
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
 * Route Guard:
 * - Only active for /dashboard/admin/** routes
 * - Throws error if used elsewhere
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
