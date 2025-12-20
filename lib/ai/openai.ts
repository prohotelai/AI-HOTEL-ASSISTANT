import { requireOpenAI, getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

type ChatMessage = {
  role: ChatRole
  content: string
  name?: string
}

type ToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

type ChatCompletionResponse = {
  id: string
  choices: Array<{
    index: number
    message: {
      role: ChatRole
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

type ChatCompletionRequest = {
  model?: string
  temperature?: number
  max_tokens?: number
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } }
}

type ChatCompletionResult = {
  message: ChatCompletionResponse['choices'][number]['message']
  usage: ChatCompletionResponse['usage']
}

const OPENAI_BASE_URL = 'https://api.openai.com/v1'

export async function createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const apiKey = requireOpenAI()
  const env = getEnv()
  const model = request.model || env.OPENAI_MODEL

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.max_tokens ?? 512,
      messages: request.messages,
      tools: request.tools,
      tool_choice: request.tool_choice,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('OpenAI API error', {
      status: response.status,
      error: errorBody.substring(0, 200), // Don't log full error (may contain sensitive info)
    })
    throw new Error(`OpenAI chat completion failed: ${response.status}`)
  }

  const data = (await response.json()) as ChatCompletionResponse
  const choice = data.choices[0]

  if (!choice) {
    throw new Error('OpenAI chat completion returned no choices')
  }

  return {
    message: choice.message,
    usage: data.usage,
  }
}

/**
 * Create text embeddings using OpenAI
 * Used for vector search in knowledge base
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = requireOpenAI()
  const env = getEnv()

  const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('OpenAI embedding error', {
      status: response.status,
      error: errorBody.substring(0, 200),
    })
    throw new Error(`OpenAI embedding failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>
  }

  if (!data.data[0]?.embedding) {
    throw new Error('OpenAI embedding returned no embeddings')
  }

  return data.data[0].embedding
}

export type { ChatMessage, ToolDefinition, ChatCompletionResult }
