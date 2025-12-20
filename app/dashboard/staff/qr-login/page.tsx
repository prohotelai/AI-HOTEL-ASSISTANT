import { Suspense } from 'react'
import QRLoginContent from './qr-login-content'

export default function StaffQRLogin() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
      <QRLoginContent />
    </Suspense>
  )
}
