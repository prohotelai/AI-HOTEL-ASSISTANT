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

export function formatRetrievedChunks(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return 'No relevant knowledge found.'
  return chunks.map((chunk, i) => `[${i + 1}] ${chunk.content}`).join('\n\n')
}
