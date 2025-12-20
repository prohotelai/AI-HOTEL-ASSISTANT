import { WidgetMessage } from './types'
import { buildEndpointUrl, toMessage } from './utils'

type ChatClientConfig = {
  apiBaseUrl: string
  hotelId: string
  conversationId?: string
  guestId?: string
  headers?: Record<string, string>
  permissions?: string[]
}

type ChatResponse = {
  conversationId: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
  }>
}

export function createChatClient(config: ChatClientConfig) {
  async function sendMessage(content: string): Promise<{ messages: WidgetMessage[]; conversationId: string }> {
    const endpoint = buildEndpointUrl(config.apiBaseUrl, '/api/chat')

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify({
        hotelId: config.hotelId,
        conversationId: config.conversationId,
        guestId: config.guestId,
        message: content,
        permissions: config.permissions,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Chat request failed: ${response.status} ${body}`)
    }

    const data = (await response.json()) as ChatResponse
    config.conversationId = data.conversationId
    const messages = data.messages.map(toMessage)
    return { messages, conversationId: data.conversationId }
  }

  return { sendMessage }
}
