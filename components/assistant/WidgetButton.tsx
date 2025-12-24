'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useAssistant } from './AssistantProvider'
import { cn } from '@/lib/utils'

export function WidgetButton() {
  const { isOpen, toggleWidget } = useAssistant()

  return (
    <Button
      onClick={toggleWidget}
      size="lg"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-xl",
        "transition-all duration-300 hover:scale-110 hover:shadow-2xl",
        "bg-gradient-to-br from-brand-primary to-brand-primary-dark",
        "border-2 border-white/20",
        isOpen && "scale-95"
      )}
      aria-label={isOpen ? "Close assistant" : "Open AI assistant"}
    >
      {isOpen ? (
        <X className="h-7 w-7" />
      ) : (
        <Image
          src="/images/logo.png"
          alt="AI Assistant"
          width={36}
          height={36}
          className="transition-transform group-hover:scale-110"
          priority
        />
      )}
    </Button>
  )
}
