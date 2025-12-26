// Stub - Knowledge base models not yet implemented

export type RetrievedChunk = {
  id: string
  documentId: string
  sequence: number
  content: string
  tokenCount: number | null
  score: number
  document: {
    id: string
    title: string
    description: string | null
    language: string | null
    updatedAt: Date
  }
}

export type RetrieveKnowledgeOptions = {
  limit?: number
  minScore?: number
}

export async function retrieveKnowledgeChunks(
  hotelId: string,
  query: string,
  options: RetrieveKnowledgeOptions = {}
): Promise<RetrievedChunk[]> {
  // Knowledge base not implemented yet
  return []
}

export async function retrieveKeywordChunks(
  hotelId: string,
  query: string,
  limit: number,
  minScore: number
): Promise<RetrievedChunk[]> {
  // Knowledge base not implemented yet
  return []
}

export async function getDocumentChunks(documentId: string): Promise<RetrievedChunk[]> {
  // Knowledge base not implemented yet
  return []
}

// Simple relevance scorer for unit tests
export function rankChunks(query: string, chunks: RetrievedChunk[]): Array<RetrievedChunk & { score: number }> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const now = Date.now()

  return [...chunks]
    .map((chunk) => {
      const content = chunk.content.toLowerCase()
      const termMatches = terms.reduce((acc, term) => acc + (content.includes(term) ? 1 : 0), 0)
      const recencyHours = Math.max(1, (now - chunk.document.updatedAt.getTime()) / (1000 * 60 * 60))
      const recencyScore = 1 / recencyHours
      const score = termMatches * 2 + recencyScore
      return { ...chunk, score }
    })
    .sort((a, b) => b.score - a.score)
}

export function formatRetrievedChunks(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return 'No relevant knowledge found.'

  return chunks
    .map((chunk, idx) => {
      return `Document ${idx + 1}: ${chunk.document.title}\n${chunk.content}`
    })
    .join('\n\n')
}
