import { redirect } from 'next/navigation'

/**
 * Setup Wizard Redirect
 * Temporary - redirects to dashboard until wizard is implemented
 */
export default function SetupRedirect() {
  redirect('/admin/dashboard')
}
