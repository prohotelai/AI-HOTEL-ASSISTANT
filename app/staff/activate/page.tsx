/**
 * Staff Activation Page (Server Wrapper)
 * Handles dynamic rendering for query params
 */

export const dynamic = 'force-dynamic'

import StaffActivateClient from './client'

export default function StaffActivatePage() {
  return <StaffActivateClient />
}
