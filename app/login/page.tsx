import { Suspense } from 'react'
import LoginContent from './login-content'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
      <LoginContent />
    </Suspense>
  )
}
