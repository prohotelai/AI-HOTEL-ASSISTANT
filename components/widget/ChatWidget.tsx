'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { cn } from '@/lib/utils'

interface ChatWidgetProps {
  hotelSlug: string
}

export function ChatWidget({ hotelSlug }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hotel, setHotel] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const response = await fetch(`/api/hotels?slug=${hotelSlug}`)
        if (response.ok) {
          const data = await response.json()
          setHotel(data.hotel)
        }
      } catch (error) {
        console.error('Failed to fetch hotel:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHotel()
  }, [hotelSlug])

  if (isLoading || !hotel) return null

  return (
    <>
      {/* Widget Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'h-14 w-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-transform hover:scale-110',
          'focus:outline-none focus:ring-2 focus:ring-offset-2'
        )}
        style={{ backgroundColor: hotel.widgetColor || '#3B82F6' }}
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Widget Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="p-4 text-white flex items-center justify-between"
            style={{ backgroundColor: hotel.widgetColor || '#3B82F6' }}
          >
            <div>
              <h3 className="font-semibold">{hotel.widgetTitle || 'Chat with us'}</h3>
              <p className="text-sm opacity-90">{hotel.name}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface hotelId={hotel.id} />
          </div>
        </div>
      )}
    </>
  )
}
