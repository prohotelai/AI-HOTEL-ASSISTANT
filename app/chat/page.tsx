'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import Link from 'next/link'
import { Hotel, ArrowLeft } from 'lucide-react'

export default function ChatPage() {
  // Demo hotel ID - in production, this would come from the user's session
  const demoHotelId = 'demo-hotel-id'

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <Hotel className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold">AI Hotel Assistant Demo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <main className="flex-1 overflow-hidden container mx-auto max-w-4xl">
        <div className="h-full bg-white shadow-sm rounded-lg m-4 overflow-hidden">
          <ChatInterface hotelId={demoHotelId} />
        </div>
      </main>
    </div>
  )
}
