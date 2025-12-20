/**
 * Pinecone Vector Database Integration
 *
 * Handles:
 * - Vector upsertion (storing embeddings)
 * - Vector queries (semantic search)
 * - Hotel-scoped namespaces (multi-tenant)
 * - Graceful fallback if not configured
 */

import { Pinecone, type ScoredPineconeRecord } from '@pinecone-database/pinecone'
import { isPineconeConfigured, requirePinecone } from '@/lib/env'
import { logger } from '@/lib/logger'

export type VectorRecord = {
  id: string
  values: number[]
  metadata?: Record<string, string | number | boolean>
}

// ============================================================================
// 1. PINECONE CLIENT (lazy-initialized)
// ============================================================================

let pineconeClient: Pinecone | null = null
let pineconeIndex: ReturnType<Pinecone['Index']> | null = null

function getPineconeIndex(): ReturnType<Pinecone['Index']> | null {
  if (!isPineconeConfigured()) {
    return null
  }

  if (!pineconeClient) {
    try {
      const creds = requirePinecone()
      pineconeClient = new Pinecone({
        apiKey: creds.apiKey,
      })
      pineconeIndex = pineconeClient.Index(creds.index)
      logger.info('Pinecone client initialized')
    } catch (error) {
      logger.warn('Failed to initialize Pinecone client', { error: (error as Error).message })
      return null
    }
  }

  return pineconeIndex
}

// ============================================================================
// 2. VECTOR OPERATIONS
// ============================================================================

/**
 * Check if vector search is available
 */
export function isVectorSearchEnabled(): boolean {
  return isPineconeConfigured() && !!getPineconeIndex()
}

/**
 * Upsert vectors to Pinecone
 * Stores embeddings for knowledge base chunks
 */
export async function upsertHotelVectors(hotelId: string, vectors: VectorRecord[]) {
  if (!vectors.length) {
    return
  }

  const index = getPineconeIndex()
  if (!index) {
    logger.debug('Vector search not configured, skipping upsert')
    return
  }

  try {
    await index.namespace(hotelId).upsert(vectors)
    logger.info('Vectors upserted', { hotelId, count: vectors.length })
  } catch (error) {
    logger.error('Failed to upsert vectors', {
      hotelId,
      error: (error as Error).message,
    })
    throw error
  }
}

/**
 * Query similar vectors from Pinecone
 * Returns most relevant knowledge base chunks
 */
export async function queryHotelVectors(
  hotelId: string,
  vector: number[],
  topK: number,
  minScore?: number
): Promise<ScoredPineconeRecord<Record<string, string | number | boolean>>[]> {
  const index = getPineconeIndex()
  if (!index) {
    logger.debug('Vector search not configured, returning empty results')
    return []
  }

  try {
    const response = await index.namespace(hotelId).query({
      vector,
      topK,
      includeMetadata: true,
    })

    const matches = response.matches ?? []
    const filtered = typeof minScore === 'number'
      ? matches.filter((match) => (match.score ?? 0) >= minScore)
      : matches

    logger.debug('Vector search completed', { hotelId, resultsCount: filtered.length })
    return filtered as any
  } catch (error) {
    logger.error('Failed to query vectors', {
      hotelId,
      error: (error as Error).message,
    })
    // Return empty results instead of throwing (graceful fallback)
    return []
  }
}
