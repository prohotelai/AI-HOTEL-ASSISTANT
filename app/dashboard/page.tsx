'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function DashboardHome() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role) {
      // Redirect based on role
      const role = session.user.role.toUpperCase()

      if (role === 'ADMIN') {
        router.push('/dashboard/admin/pms')
      } else if (role === 'STAFF') {
        router.push('/dashboard/staff/tasks')
      } else if (role === 'GUEST') {
        router.push('/dashboard/guest/bookings')
      } else {
        // Default fallback
        router.push('/dashboard/guest/bookings')
      }
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}
