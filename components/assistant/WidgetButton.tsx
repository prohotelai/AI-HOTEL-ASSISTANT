'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { useAssistant } from './AssistantProvider'
import { cn } from '@/lib/utils'

export function WidgetButton() {
  const { isOpen, toggleWidget } = useAssistant()

  return (
    <button
      onClick={toggleWidget}
      className={cn(
        "fixed bottom-6 right-6 z-50 h-16 w-16",
        "transition-all duration-300 hover:scale-110",
        "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
        "rounded-full",
        isOpen ? "scale-95" : "drop-shadow-2xl hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.3)]"
      )}
      aria-label={isOpen ? "Close assistant" : "Open AI assistant"}
    >
      {isOpen ? (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-dark flex items-center justify-center border-2 border-white/20">
          <X className="h-7 w-7 text-white" />
        </div>
      ) : (
        <Image
          src="/images/logo.png"
          alt="AI Assistant"
          width={64}
          height={64}
          className="rounded-full transition-transform"
          priority
        />
      )}
    </button>
  )
}
