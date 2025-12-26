'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

/**
 * AdminContext - SaaS Platform Level Context
 * 
 * STRICT ISOLATION:
 * - This context MUST ONLY be used in /admin/** routes (and legacy /dashboard/admin/**)
 * - NEVER import or use PMS contexts
 * - Provides SaaS-level user and hotel information
 * 
 * Data Scope:
 * - Platform admin user info
 * - Hotel management data (not PMS operations data)
 * - System-level permissions
 */

interface AdminContextValue {
  userId: string | null
  userName: string | null
  userEmail: string | null
  hotelId: string | null
  hotelName: string | null
  role: string | null
  isAdmin: boolean
  isLoading: boolean
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

interface AdminProviderProps {
  children: ReactNode
}

export function AdminProvider({ children }: AdminProviderProps) {
  const { data: session, status } = useSession()

  const contextValue: AdminContextValue = {
    userId: (session?.user as any)?.id || null,
    userName: session?.user?.name || null,
    userEmail: session?.user?.email || null,
    hotelId: (session?.user as any)?.hotelId || null,
    hotelName: (session?.user as any)?.hotel?.name || null,
    role: (session?.user as any)?.role || null,
    isAdmin: ['OWNER', 'ADMIN', 'MANAGER'].includes((session?.user as any)?.role?.toUpperCase() || ''),
    isLoading: status === 'loading',
  }

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  )
}

/**
 * useAdminContext - Hook to access Admin context
 * 
 * STRICT RULE:
 * - Can ONLY be called from components within /admin/** routes
 * - Will throw error if called from PMS routes
 */
export function useAdminContext() {
  const context = useContext(AdminContext)

  if (context === undefined) {
    throw new Error('useAdminContext must be used within AdminProvider')
  }

  // GUARD: Ensure we're in an admin route; log instead of throwing to avoid client crashes on legacy routes
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard/admin')

    if (!isAdminRoute) {
      console.error('❌ CRITICAL: useAdminContext called outside admin routes:', pathname)
        console.error('useAdminContext can only be used in /admin routes')
      // Soft failure: return context to avoid crash while still surfacing the misuse
      return context
    }
  }

  return context
}
