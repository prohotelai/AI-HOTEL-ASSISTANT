/**
 * Connect External PMS Page
 * Admin-only page for connecting external PMS systems
 */

import { Metadata } from 'next'
import PMSConnectionWizard from '@/components/admin/PMSConnectionWizard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/rbac'
import { Permission } from '@/lib/rbac'

export const metadata: Metadata = {
  title: 'Connect External PMS | Admin',
  description: 'Connect your existing property management system'
}

export default async function ConnectPMSPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user has admin permissions
  const userRole = session.user.role
  const hasAccess = hasPermission(userRole, Permission.ADMIN_VIEW)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <main>
      <PMSConnectionWizard />
    </main>
  )
}
