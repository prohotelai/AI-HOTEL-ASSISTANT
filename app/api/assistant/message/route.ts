import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow limited access for unauthenticated users (public assistant)
    const isPublic = !session

    const body = await request.json()
    const { message, metadata } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build context for the assistant
    const context = {
      userMessage: message,
      source: metadata?.source || 'unknown',
      page: metadata?.page || '/',
      isAuthenticated: !isPublic,
      userId: session?.user?.id,
      hotelId: (session?.user as any)?.hotelId
    }

    // Simple assistant logic (can be expanded with RAG later)
    const response = await generateAssistantResponse(context)

    return NextResponse.json({
      response,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'assistant'
      }
    })

  } catch (error) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateAssistantResponse(context: any): Promise<string> {
  const { userMessage, isAuthenticated, page } = context

  // Simple rule-based responses (can be enhanced with OpenAI/RAG)
  const lowerMessage = userMessage.toLowerCase()

  // Feature explanations
  if (lowerMessage.includes('features') || lowerMessage.includes('what can')) {
    return `# Platform Features

I can help you with:

🎫 **Tickets** - Guest request management system
📚 **Knowledge Base** - Document and FAQ management with AI-powered search
🏨 **PMS Integration** - Connect with Opera, Mews, and other property management systems
👥 **Staff Management** - Team collaboration and role-based access
📊 **Analytics** - Real-time insights and reporting
🎙️ **Voice Mode** - AI voice assistant for hands-free support

What would you like to explore?`
  }

  // Setup guide
  if (lowerMessage.includes('setup') || lowerMessage.includes('get started')) {
    return `# Getting Started

**Step 1:** Set up your hotel profile in Settings
**Step 2:** Invite your team members
**Step 3:** Configure your Knowledge Base with hotel policies
**Step 4:** Connect your PMS (optional)
**Step 5:** Train your staff on the ticket system

Need help with any specific step?`
  }

  // Dashboard help
  if (lowerMessage.includes('dashboard')) {
    return `# Dashboard Overview

Your dashboard shows:
- 📊 **Key metrics** - Ticket stats, response times, guest satisfaction
- 🎫 **Recent tickets** - Latest guest requests
- 📈 **Activity feed** - Team actions and updates
- ⚡ **Quick actions** - Common tasks

${isAuthenticated ? '\n[Click here to view your dashboard](/dashboard)' : '\nPlease log in to access your dashboard.'}`
  }

  // Tickets help
  if (lowerMessage.includes('ticket')) {
    return `# Ticket System

**Creating Tickets:**
- Guests can submit via chat widget or QR code
- Staff can create tickets on behalf of guests
- AI automatically categorizes and prioritizes

**Managing Tickets:**
- Assign to team members
- Set priority levels
- Track SLA compliance
- Add internal notes

**Best Practices:**
- Respond within 15 minutes
- Use templates for common issues
- Always close with guest confirmation

Need help with a specific ticket?`
  }

  // Knowledge base help
  if (lowerMessage.includes('knowledge') || lowerMessage.includes('documents')) {
    return `# Knowledge Base

Upload and manage:
- Hotel policies
- FAQ documents
- Standard operating procedures
- Training materials

**Features:**
- AI-powered search
- Automatic document chunking
- Multi-language support
- Version control

The AI assistant uses these documents to answer guest questions accurately.`
  }

  // Default helpful response
  return `I'm here to help! I can assist you with:

- **Platform features** - Learn what the system can do
- **Getting started** - Setup and configuration guide
- **Dashboard navigation** - Find your way around
- **Tickets** - Guest request management
- **Knowledge Base** - Document management
- **Settings** - Configure your hotel profile

What would you like to know more about?`
}
