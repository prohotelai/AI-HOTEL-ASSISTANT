import { redirect } from 'next/navigation'

/**
 * PMS Redirect
 * Temporary redirect to legacy /dashboard/admin/pms until migration complete
 */
export default function PMSRedirect() {
  redirect('/dashboard/admin/pms')
}
