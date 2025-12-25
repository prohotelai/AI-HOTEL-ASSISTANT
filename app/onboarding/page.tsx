'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * OLD Onboarding System - DEPRECATED
 * Redirects to NEW AI Setup Wizard
 */

export const dynamic = 'force-dynamic'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/setup-wizard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to Setup Wizard...</p>
      </div>
    </div>
  )
}
