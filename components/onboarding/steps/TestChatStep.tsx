/**
 * Onboarding Step: Test Chat
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Loader2, Sparkles } from 'lucide-react'

interface TestChatStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  confidence?: number
}

export default function TestChatStep({ hotelId, onComplete, onNext, onBack }: TestChatStepProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your hotel\'s AI assistant. Ask me anything about your hotel!',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const sampleQuestions = [
    'What time is check-in?',
    'Do you have a swimming pool?',
    'What are your room rates?',
    'Is breakfast included?',
  ]

  async function handleSend(question?: string) {
    const messageText = question || input
    if (!messageText.trim() || sending) return

    setSending(true)
    const userMessage: Message = { role: 'user', content: messageText }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    try {
      const res = await fetch(`/api/onboarding/${hotelId}/test/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })

      if (res.ok) {
        const data = await res.json()
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || 'Sorry, I couldn\'t generate a response.',
          confidence: data.confidence,
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Oops! There was an error. Please try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setSending(false)
    }
  }

  function handleContinue() {
    onComplete()
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-brand-text mb-2">
          Test Your AI Assistant
        </h2>
        <p className="text-brand-muted">
          Try asking questions like a guest would. See how your AI responds!
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border mb-6">
        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-brand-text'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.confidence !== undefined && (
                  <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                    <Sparkles className="w-3 h-3" />
                    <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Sample Questions */}
        <div className="border-t border-brand-border p-4">
          <p className="text-sm font-medium text-brand-text mb-3">Try these questions:</p>
          <div className="grid grid-cols-2 gap-2">
            {sampleQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(question)}
                disabled={sending}
                className="text-left px-3 py-2 text-sm bg-brand-primary/5 text-brand-primary rounded hover:bg-brand-primary/10 transition-colors disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Input Box */}
        <div className="border-t border-brand-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your test question..."
              className="flex-1 px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>How does it look?</strong> The AI learns from the information you provided. Add more content in the Knowledge Base section to improve responses.
        </p>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 text-brand-muted hover:text-brand-text transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors"
        >
          Continue →
        </button>
      </div>
    </motion.div>
  )
}
