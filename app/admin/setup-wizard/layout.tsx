import { ReactNode } from 'react'

/**
 * AI Setup Wizard Layout
 * 
 * STRICT ISOLATION:
 * - NO AdminHeader
 * - NO PMSLayout
 * - NO Dashboard navigation
 * - NO Shared providers
 * 
 * This is a CLEAN wizard experience:
 * - Fullscreen wizard UI
 * - No distractions
 * - Mobile responsive
 * - Focuses user on setup
 * 
 * Route Guard:
 * - Only active for /admin/setup-wizard/** routes
 */

export default function SetupWizardLayout({ children }: { children: ReactNode }) {
  // Clean wizard layout - no dashboard components
  if (typeof window !== 'undefined') {
    console.log('🧙 ACTIVE LAYOUT: AI SETUP WIZARD')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {children}
    </div>
  )
}
