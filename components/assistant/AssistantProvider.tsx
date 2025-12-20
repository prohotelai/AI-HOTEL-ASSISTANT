'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AssistantContextType {
  isOpen: boolean
  messages: Message[]
  isLoading: boolean
  openWidget: () => void
  closeWidget: () => void
  toggleWidget: () => void
  sendMessage: (content: string, metadata?: Record<string, any>) => Promise<void>
  clearMessages: () => void
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const openWidget = useCallback(() => setIsOpen(true), [])
  const closeWidget = useCallback(() => setIsOpen(false), [])
  const toggleWidget = useCallback(() => setIsOpen(prev => !prev), [])

  const sendMessage = useCallback(async (content: string, metadata?: Record<string, any>) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          metadata: {
            source: 'widget',
            page: window.location.pathname,
            ...metadata
          }
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Assistant error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        openWidget,
        closeWidget,
        toggleWidget,
        sendMessage,
        clearMessages
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider')
  }
  return context
}
