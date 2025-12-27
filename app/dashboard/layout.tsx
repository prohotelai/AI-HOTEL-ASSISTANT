'use client'

import { ReactNode } from 'react'
import DashboardNavigation from '@/components/pms/DashboardNavigation'
import { PMSProvider } from '@/lib/contexts/PMSContext'

/**
 * DashboardLayout - PMS Operations Level Layout
 * 
 * IMPORTANT:
 * - This layout applies to /dashboard/hotel/**, /dashboard/staff/**, /dashboard/guest/** routes
 * - This layout is OVERRIDDEN by /dashboard/admin/layout.tsx for admin routes
 * - Uses PMSProvider for PMS-level context
 * 
 * CRITICAL: Marked as 'use client' to ensure PMSProvider (context) properly wraps
 * client components (DashboardNavigation) during hydration. Without this,
 * usePMSContext() fails with "usePMSContext must be used within PMSProvider" error.
 */

export default function DashboardLayout({ children }: { children: ReactNode }) {
  console.log('DashboardLayout: Rendering DashboardNavigation')
  return (
    <PMSProvider>
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        {children}
      </div>
    </PMSProvider>
  )
}
