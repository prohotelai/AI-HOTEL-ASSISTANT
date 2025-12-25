import { redirect } from 'next/navigation'

/**
 * Legacy Admin Dashboard Redirect
 * 
 * Redirects /dashboard/admin → /admin/dashboard
 * 
 * This maintains backward compatibility for bookmarked URLs.
 * The real admin dashboard is now at /admin/dashboard.
 */

export default function LegacyAdminDashboardRedirect() {
  redirect('/admin/dashboard')
}
