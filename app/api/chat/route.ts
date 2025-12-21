export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { permissionsForRole } from '@/lib/rbac'
import { retrieveKnowledgeChunks, formatRetrievedChunks } from '@/lib/ai/retrieval'
import { createChatCompletion, ChatMessage } from '@/lib/ai/openai'
import { toolDefinitions, executeToolCall } from '@/lib/ai/tools'
import { eventBus } from '@/lib/events/eventBus'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { validateStaffSession, validateGuestSession } from '@/lib/auth/sessionValidation'
import {
  checkAIMessageLimit,
  incrementAIMessageUsage,
  UsageLimitError,
} from '@/lib/subscription/usageTracking'

const MAX_HISTORY = 12

/**
 * Chat context interface - required before AI can respond
 */
interface ChatContext {
  role: 'ADMIN' | 'STAFF' | 'GUEST'
  hotelId: string
  userId?: string
  staffId?: string
  guestId?: string
  roomId?: string
  conversationId?: string
}

/**
 * Extract chat context from request
 * CRITICAL: AI chat requires valid context before processing
 */
async function extractChatContext(req: NextRequest): Promise<ChatContext | null> {
  // Check for Bearer token (staff/guest sessions)
  const authHeader = req.headers.get('authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')

  if (sessionToken) {
    // Try staff session
    const staffSession = await validateStaffSession(sessionToken)
    if (staffSession) {
      return {
        role: 'STAFF',
        hotelId: staffSession.hotelId,
        staffId: staffSession.userId,
        userId: staffSession.userId,
      }
    }

    // Try guest session
    const guestSession = await validateGuestSession(sessionToken)
    if (guestSession) {
      return {
        role: 'GUEST',
        hotelId: guestSession.hotelId,
        guestId: guestSession.id,
        roomId: guestSession.guestRoomNumber || undefined,
        conversationId: guestSession.conversationId || undefined,
      }
    }
  }

  // Fallback: Check NextAuth session (admin)
  // This will be handled by withAuth wrapper
  return null
}

async function handleChat(req: NextRequest, ctx: AuthContext) {
  try {
    // ===== CONTEXT GATING (CRITICAL) =====
    // Extract role context before processing AI request
    let chatContext = await extractChatContext(req)
    
    // If no session context, use admin context from withAuth
    if (!chatContext && ctx.userId) {
      chatContext = {
        role: 'ADMIN',
        hotelId: ctx.hotelId,
        userId: ctx.userId,
      }
    }

    // BLOCK: AI chat requires valid context
    if (!chatContext || !chatContext.hotelId) {
      return NextResponse.json(
        { 
          error: 'AI chat requires valid context',
          message: 'Unable to determine role and hotel. Please log in again.' 
        },
        { status: 403 }
      )
    }

    // Validate role-specific requirements
    if (chatContext.role === 'STAFF' && !chatContext.staffId) {
      return NextResponse.json(
        { error: 'Staff context requires staffId' },
        { status: 403 }
      )
    }

    if (chatContext.role === 'GUEST' && !chatContext.guestId) {
      return NextResponse.json(
        { error: 'Guest context requires identification' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { message, conversationId, hotelId, guestId } = body

    if (!message || !hotelId) {
      return NextResponse.json({ error: 'Message and hotelId are required' }, { status: 400 })
    }

    // Enforce hotel scoping - users can only chat for their own hotel
    if (hotelId !== chatContext.hotelId) {
      return NextResponse.json({ error: 'Forbidden - Hotel access denied' }, { status: 403 })
    }

    try {
      await checkAIMessageLimit(hotelId, 1)
    } catch (error) {
      if (error instanceof UsageLimitError) {
        eventBus.emit('usage.limit.exceeded', {
          hotelId,
          limitType: error.limitType,
          currentUsage: error.currentUsage,
          limit: error.limit,
        })

        return NextResponse.json(
          {
            error: 'AI Message Limit Exceeded',
            message: error.message,
            limitType: error.limitType,
            currentUsage: error.currentUsage,
            limit: error.limit,
            upgradeUrl: error.upgradeUrl,
          },
          { status: 402 }
        )
      }

      throw error
    }

    const conversation = await getOrCreateConversation({
      conversationId,
      hotelId,
      sessionUserId: ctx.userId,
      guestId: guestId ?? null,
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: MAX_HISTORY,
    })

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    const knowledgeChunks = await retrieveKnowledgeChunks(hotelId, message, { limit: 6 })
    const contextBlock = knowledgeChunks.length ? formatRetrievedChunks(knowledgeChunks) : 'No specific hotel knowledge matched this message.'

    const systemPrompt = `You are a helpful AI concierge for hotel staff and guests. Always provide concise, friendly answers.
Use the provided hotel knowledge when relevant and cite specific policies where possible.
If you are unsure, say so and suggest contacting hotel staff.`

    const baseMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}

Context:
${contextBlock}`,
      },
      ...history
        .map((entry) => ({ role: entry.role as 'user' | 'assistant', content: entry.content }))
        .slice(-MAX_HISTORY),
      { role: 'user', content: message },
    ]

    let assistantContent = ''
    let modelUsed = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    let usage: { prompt?: number; completion?: number; total?: number } | undefined

    try {
      const completion = await createChatCompletion({
        messages: baseMessages,
        tools: toolDefinitions as unknown as any[],
        tool_choice: 'auto',
      })

      usage = {
        prompt: completion.usage?.prompt_tokens,
        completion: completion.usage?.completion_tokens,
        total: completion.usage?.total_tokens,
      }

      if (completion.message.tool_calls?.length) {
        const permissions = permissionsForRole(ctx.role)
        for (const toolCall of completion.message.tool_calls) {
          const result = await executeToolCall(toolCall.function.name, toolCall.function.arguments, {
            hotelId,
            userId: ctx.userId,
            permissions,
          })
          if (result) {
            assistantContent += `Tool ${result.name} executed: ${JSON.stringify(result.result)}\n`
          }
        }
      }

      assistantContent += completion.message.content ?? ''
    } catch (error) {
      console.error('AI completion failed, using fallback response:', error)
      modelUsed = 'fallback-response'
      assistantContent = `Thank you for your message: "${message}". Our AI assistant is temporarily unavailable, but the team will respond shortly.`
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantContent.trim(),
        model: modelUsed,
        tokens: usage?.total,
      },
    })

    await incrementAIMessageUsage(hotelId, 1)

    eventBus.emit('chat.message.generated', {
      conversationId: conversation.id,
      hotelId,
      model: modelUsed,
      tokenUsage: usage,
    })

    return NextResponse.json({
      conversationId: conversation.id,
      messages: [
        {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
        },
      ],
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withAuth(handleChat)

type ConversationContext = {
  conversationId?: string | null
  hotelId: string
  sessionUserId: string | null
  guestId: string | null
}

async function getOrCreateConversation(context: ConversationContext) {
  if (context.conversationId) {
    return prisma.conversation.findFirst({
      where: {
        id: context.conversationId,
        hotelId: context.hotelId,
      },
    })
  }

  return prisma.conversation.create({
    data: {
      hotelId: context.hotelId,
      userId: context.sessionUserId ?? undefined,
      guestId: context.guestId,
    },
  })
}
