import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertPermission, Permission } from '@/lib/rbac'

export default async function BookingDetailPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/dashboard/admin/bookings')
  }

  assertPermission(session, Permission.ADMIN_VIEW)

  // Booking model not yet implemented
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Booking Details</h2>
        <p className="mt-2 text-white/60">Booking feature not yet implemented</p>
      </div>
    </div>
  )
}
