import { ReactNode } from 'react'

/**
 * Auth Layout - For Login/Signup Pages Only
 * 
 * STRICT ISOLATION:
 * - NO AdminLayout
 * - NO PMSLayout  
 * - NO AdminHeader
 * - NO PMSHeader
 * - NO Dashboard providers
 * 
 * This layout wraps authentication pages:
 * - /admin/login
 * - /admin/register
 * - /login (legacy redirect)
 * - /register (legacy redirect)
 */

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Simple auth layout - no dashboard components
  if (typeof window !== 'undefined') {
    console.log('🔐 ACTIVE LAYOUT: AUTH')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
