import { Suspense } from 'react'
import GuestAccessClient from './client'

export const dynamic = 'force-dynamic'

export default function GuestAccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GuestAccessClient />
    </Suspense>
  )
}
