'use client'

/**
 * DEPRECATED: Old Setup Wizard
 * 
 * This route has been replaced by /admin/setup-wizard
 * Redirecting all traffic to the new wizard system.
 * 
 * DO NOT USE THIS FILE - it exists only for backward compatibility
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OldSetupRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to new wizard immediately
    router.replace('/admin/setup-wizard')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to setup wizard...</p>
      </div>
    </div>
  )
}
