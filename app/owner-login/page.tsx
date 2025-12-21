'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy redirect: /owner-login → /admin/login
 * Maintains backward compatibility for bookmarked URLs
 */
export default function OwnerLoginRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/login')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to admin login...</p>
      </div>
    </div>
  )
}
