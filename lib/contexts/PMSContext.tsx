'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

/**
 * PMSContext - Hotel Operations Level Context
 * 
 * STRICT ISOLATION:
 * - This context MUST ONLY be used in /dashboard/hotel/**, /dashboard/staff/**, /dashboard/guest/** routes
 * - NEVER import or use Admin contexts
 * - Provides hotel operations data (bookings, rooms, tickets, etc.)
 * 
 * Data Scope:
 * - Hotel operational user info
 * - PMS operations data (bookings, rooms, guests)
 * - Staff/Guest level permissions
 */

interface PMSContextValue {
  userId: string | null
  userName: string | null
  userEmail: string | null
  hotelId: string | null
  hotelName: string | null
  role: string | null
  isStaff: boolean
  isGuest: boolean
  isLoading: boolean
}

const PMSContext = createContext<PMSContextValue | undefined>(undefined)

interface PMSProviderProps {
  children: ReactNode
}

export function PMSProvider({ children }: PMSProviderProps) {
  const { data: session, status } = useSession()

  const role = (session?.user as any)?.role?.toUpperCase() || ''

  const contextValue: PMSContextValue = {
    userId: (session?.user as any)?.id || null,
    userName: session?.user?.name || null,
    userEmail: session?.user?.email || null,
    hotelId: (session?.user as any)?.hotelId || null,
    hotelName: (session?.user as any)?.hotel?.name || null,
    role: (session?.user as any)?.role || null,
    isStaff: ['STAFF', 'MANAGER'].includes(role),
    isGuest: role === 'GUEST',
    isLoading: status === 'loading',
  }

  return (
    <PMSContext.Provider value={contextValue}>
      {children}
    </PMSContext.Provider>
  )
}

/**
 * usePMSContext - Hook to access PMS context
 * 
 * STRICT RULE:
 * - Can ONLY be called from components within /dashboard/hotel/**, /dashboard/staff/**, /dashboard/guest/** routes
 * - Will throw error if called from Admin routes
 */
export function usePMSContext() {
  const context = useContext(PMSContext)

  if (context === undefined) {
    throw new Error('usePMSContext must be used within PMSProvider')
  }

  // GUARD: Ensure we're NOT in an admin route
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    if (pathname.startsWith('/dashboard/admin')) {
      console.error('❌ CRITICAL: usePMSContext called in /admin routes:', pathname)
      throw new Error('usePMSContext cannot be used in /admin routes. Use useAdminContext instead.')
    }
  }

  return context
}
