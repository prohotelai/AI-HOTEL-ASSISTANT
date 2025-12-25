import { redirect } from 'next/navigation'

/**
 * Admin Dashboard Redirect
 * 
 * Redirects /admin/dashboard → /dashboard/admin
 * 
 * This is a transitional redirect while we maintain the existing
 * dashboard structure at /dashboard/admin with its own layout override.
 * 
 * Future: Move all /dashboard/admin content to /admin/dashboard
 */

export default function AdminDashboardRedirect() {
  redirect('/dashboard/admin')
}
