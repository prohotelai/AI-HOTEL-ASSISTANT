'use client'

import { useEffect } from 'react'
import LandingPageClient from '@/components/marketing/LandingPageClient'

export default function MarketingClientPage() {
  // Prevents tree-shaking - ensures client bundle is emitted
  useEffect(() => {}, [])
  
  return <LandingPageClient />
}
