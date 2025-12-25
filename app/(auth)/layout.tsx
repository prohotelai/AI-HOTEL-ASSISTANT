import { ReactNode } from 'react'

/**
 * Auth Layout - For Login/Signup Pages Only
 * 
 * CRITICAL ISOLATION:
 * - This route group is at ROOT level (app/(auth)/*)
 * - Does NOT inherit from /app/admin/layout.tsx
 * - NO AdminProvider
 * - NO AdminHeader
 * - NO PMSProvider
 * - NO Dashboard providers
 * 
 * Routes:
 * - /admin/login (app/(auth)/admin/login/)
 * - /admin/register (app/(auth)/admin/register/)
 * 
 * This ensures auth pages NEVER trigger admin context.
 */

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
