import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'AI Hotel Assistant',
  description: 'Multi-tenant AI-powered hotel assistant platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
