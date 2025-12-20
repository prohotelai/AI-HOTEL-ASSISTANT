export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Test Chat API for Onboarding
 * POST /api/onboarding/[hotelId]/test/chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createChatCompletion } from '@/lib/ai/openai'
import { retrieveKnowledgeChunks } from '@/lib/ai/retrieval'
import { z } from 'zod'

const chatTestSchema = z.object({
  message: z.string().min(1, 'Message required'),
  conversationId: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token || token.hotelId !== params.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = chatTestSchema.parse(body)

    // Retrieve relevant knowledge
    const knowledgeChunks = await retrieveKnowledgeChunks(
      params.hotelId,
      validated.message
    )

    const context = knowledgeChunks.map((c) => c.content).join('\n\n')

    // Create system prompt
    const systemPrompt = `You are a helpful AI assistant for a hotel. Answer guest questions accurately and professionally.

Available hotel information:
${context || 'No specific hotel information loaded yet.'}

If you don't know something, suggest contacting the front desk.`

    // Get AI response
    const aiResponse = await createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: validated.message },
      ],
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500,
    })

    const assistantMessage = aiResponse.message?.content || 'Sorry, I could not generate a response.'

    // Calculate confidence score (simplified)
    const confidence = knowledgeChunks.length > 0 ? 0.85 : 0.5

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      confidence,
      chunksUsed: knowledgeChunks.length,
      usage: aiResponse.usage,
    })
  } catch (error) {
    console.error('Chat test error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    // Return graceful error for testing
    return NextResponse.json({
      success: false,
      response: 'I apologize, but I encountered an error. This is a test environment.',
      confidence: 0,
      error: String(error),
    })
  }
}
