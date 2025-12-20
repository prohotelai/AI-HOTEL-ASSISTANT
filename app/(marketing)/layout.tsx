import { ReactNode } from 'react'
import type { Metadata } from 'next'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'AI Hotel Assistant - Modern Hotel Operating System',
  description: 'An all-in-one AI-powered hotel operating system delivering 24/7 chat and voice assistants, PMS integration, automation workflows, and custom AI training.',
  keywords: 'hotel management, AI assistant, hotel software, PMS integration, hotel automation',
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
