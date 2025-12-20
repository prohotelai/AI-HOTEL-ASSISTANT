import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { authOptions } from '@/lib/auth'
import { Permission, assertPermission } from '@/lib/rbac'
import { getAdminDashboardData } from '@/lib/services/adminService'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  let context: { hotelId: string }

  try {
    context = assertPermission(session, Permission.ADMIN_VIEW)
  } catch (error) {
    if ((error as any)?.status === 403) {
      redirect('/dashboard')
    }
    throw error
  }

  const data = await getAdminDashboardData(context.hotelId)

  return <AdminDashboard data={data} />
}
