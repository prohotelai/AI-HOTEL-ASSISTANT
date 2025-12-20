import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import { AssistantProvider } from '@/components/assistant/AssistantProvider'
import { WidgetButton } from '@/components/assistant/WidgetButton'
import { WidgetChatWindow } from '@/components/assistant/WidgetChatWindow'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

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
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <SessionProvider>
          <AssistantProvider>
            {children}
            <WidgetButton />
            <WidgetChatWindow />
          </AssistantProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
