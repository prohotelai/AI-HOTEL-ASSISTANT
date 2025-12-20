'use client'

import { useState } from 'react'
import { Send, Book, Settings, BarChart3, Users, Ticket, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const quickHelp = [
    {
      icon: Book,
      title: "Explain all features",
      description: "Get a complete overview of the platform"
    },
    {
      icon: Settings,
      title: "How to set up the hotel",
      description: "Step-by-step configuration guide"
    },
    {
      icon: Database,
      title: "How to use RAG?",
      description: "Learn about AI-powered knowledge retrieval"
    },
    {
      icon: Users,
      title: "How to invite staff?",
      description: "Team management and invitations"
    }
  ]

  const handleQuickAction = async (title: string) => {
    await sendMessage(title)
  }

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          metadata: { source: 'assistant-page', page: '/assistant' }
        })
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">AI Assistant</h1>
        <p className="text-muted-foreground">
          Your intelligent guide to the AI Hotel Platform
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Quick Help Cards */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Help</CardTitle>
              <CardDescription>Common questions and guides</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickHelp.map((item, idx) => {
                const Icon = item.icon
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleQuickAction(item.title)}
                  >
                    <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </Button>
                )
              })}
            </CardContent>
          </Card>

          {/* Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="step1">
                  <AccordionTrigger>1. Initial Setup</AccordionTrigger>
                  <AccordionContent>
                    Configure your hotel profile, logo, and contact information
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step2">
                  <AccordionTrigger>2. Team Invitations</AccordionTrigger>
                  <AccordionContent>
                    Invite staff members and assign roles
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step3">
                  <AccordionTrigger>3. Knowledge Base</AccordionTrigger>
                  <AccordionContent>
                    Upload hotel policies and FAQ documents
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step4">
                  <AccordionTrigger>4. PMS Integration</AccordionTrigger>
                  <AccordionContent>
                    Connect your property management system
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Chat with Assistant</CardTitle>
            <CardDescription>Ask anything about the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col h-[600px]">
              <ScrollArea className="flex-1 pr-4 mb-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <p className="text-lg mb-2">👋 Hello!</p>
                    <p>I&apos;m your AI assistant. Ask me anything!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p>{message.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
