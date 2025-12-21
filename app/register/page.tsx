'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy redirect: /register → /admin/register
 * Maintains backward compatibility for bookmarked URLs
 */
export default function RegisterRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/register')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to admin registration...</p>
      </div>
    </div>
  )
}
