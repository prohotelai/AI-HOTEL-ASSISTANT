import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Placeholder for AI chat endpoint
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const { message, conversationId, hotelId, guestId } = body

    if (!message || !hotelId) {
      return NextResponse.json(
        { error: 'Message and hotelId are required' },
        { status: 400 }
      )
    }

    // Find or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      })
    } else {
      conversation = await prisma.conversation.create({
        data: {
          hotelId,
          userId: session?.user?.id,
          guestId: guestId || null,
        },
        include: { messages: true }
      })
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      }
    })

    // TODO: Replace with actual OpenAI API call
    // Placeholder AI response
    const aiResponse = `Thank you for your message: "${message}". This is a placeholder response. In production, this would be powered by OpenAI's GPT model with context from your hotel's knowledge base stored in Pinecone.`

    // Save AI response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse,
        model: 'placeholder-gpt-4',
      }
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
        }
      ]
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
