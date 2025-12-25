import { ReactNode } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { AdminProvider } from '@/lib/contexts/AdminContext'

/**
 * Admin Layout - SaaS Platform Level Layout
 * 
 * STRICT ISOLATION:
 * - This layout applies to /admin/** routes ONLY
 * - Auth routes (/admin/login, /admin/register) are in app/(auth)/admin/*
 *   and do NOT use this layout (route group isolation)
 * - Uses AdminHeader (NOT PMS DashboardNavigation)
 * - Uses AdminProvider (NOT PMSProvider)
 * - NEVER imports PMS components
 * - NEVER shares layouts with PMS dashboard
 * 
 * Route Scope:
 * - /admin/dashboard (main dashboard)
 * - /admin/** (all admin routes except auth)
 * 
 * Excluded (via route group):
 * - /admin/login (in app/(auth)/admin/login/)
 * - /admin/register (in app/(auth)/admin/register/)
 * 
 * CRITICAL:
 * This is the ONLY place AdminProvider should exist.
 * Auth pages use app/(auth)/layout.tsx instead.
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
