const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'

export async function createEmbeddings(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) {
    return []
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenAI embeddings request failed: ${response.status} ${errorBody}`)
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>
  }

  return data.data.map((item) => item.embedding)
}

export function isEmbeddingConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}
