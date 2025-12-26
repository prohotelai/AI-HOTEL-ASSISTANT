import { redirect } from 'next/navigation'

/**
 * RBAC Redirect
 * Temporary redirect to legacy /dashboard/admin/rbac until migration complete
 */
export default function RBACRedirect() {
  redirect('/dashboard/admin/rbac')
}
