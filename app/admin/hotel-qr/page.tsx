import { redirect } from 'next/navigation'

/**
 * Hotel QR Redirect
 * Temporary redirect to legacy /dashboard/admin/hotel-qr until migration complete
 */
export default function HotelQRRedirect() {
  redirect('/dashboard/admin/hotel-qr')
}
