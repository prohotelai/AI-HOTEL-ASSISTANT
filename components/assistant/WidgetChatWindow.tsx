'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAssistant } from './AssistantProvider'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

export function WidgetChatWindow() {
  const { isOpen, messages, isLoading, closeWidget, sendMessage } = useAssistant()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeWidget()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeWidget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  const quickActions = [
    "Explain all features",
    "How to set up my hotel?",
    "Show me the dashboard",
    "Help with tickets"
  ]

  if (!isOpen) return null

  return (
    <Card
      className={cn(
        "fixed bottom-24 right-6 z-40",
        "w-[380px] h-[600px] max-h-[80vh]",
        "flex flex-col shadow-2xl",
        "animate-in slide-in-from-bottom-4 duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-brand-primary to-brand-primary-dark text-white">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="AI Assistant"
            width={32}
            height={32}
            className="rounded-full bg-white/10 p-1"
          />
          <div>
            <h3 className="font-semibold text-sm">AI Hotel Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs opacity-90">Online</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={closeWidget}
          className="h-8 w-8 p-0 hover:bg-white/20 text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center text-gray-600 text-sm py-8">
              <p className="mb-4">👋 Hi! I&apos;m your AI assistant.</p>
              <p>Ask me anything about the platform!</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Quick actions:</p>
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => sendMessage(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2.5",
                    message.role === 'user'
                      ? "bg-brand-primary text-white"
                      : "bg-gray-100 text-gray-900 border border-gray-200"
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-gray-900">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  )
}
