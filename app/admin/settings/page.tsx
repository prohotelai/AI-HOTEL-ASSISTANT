import { redirect } from 'next/navigation'

/**
 * Settings Redirect
 * Temporary redirect to legacy /dashboard/admin/settings until migration complete
 */
export default function SettingsRedirect() {
  redirect('/dashboard/admin/settings')
}
