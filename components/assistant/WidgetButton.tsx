'use client'

import { MessageCircle, X } from 'lucide-react'
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
        "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
        "transition-all duration-200 hover:scale-110",
        isOpen && "rotate-90"
      )}
      aria-label={isOpen ? "Close assistant" : "Open assistant"}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  )
}
