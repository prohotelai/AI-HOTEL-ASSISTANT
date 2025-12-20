// RAG Loader for Internal Documentation
// Loads internal docs from filesystem for assistant queries

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

interface DocumentChunk {
  content: string
  metadata: {
    source: string
    section?: string
  }
}

// In-memory cache of documentation chunks
let cachedChunks: DocumentChunk[] | null = null

/**
 * Load all internal documentation files from docs/internal/
 * Note: Since knowledge base models don't exist yet, we load from filesystem
 */
export async function loadInternalDocumentation(): Promise<DocumentChunk[]> {
  if (cachedChunks) {
    return cachedChunks
  }
  const docsPath = join(process.cwd(), 'docs', 'internal')
  
  try {
    // Read all markdown files from internal docs
    const files = await readdir(docsPath)
    const markdownFiles = files.filter(f => f.endsWith('.md'))

    console.log(`[RAG Loader] Found ${markdownFiles.length} internal documentation files`)

    const allChunks: DocumentChunk[] = []

    // Process each file
    for (const file of markdownFiles) {
      const filePath = join(docsPath, file)
      const content = await readFile(filePath, 'utf-8')

      // Chunk the document content (split by headings)
      const chunks = chunkDocument(content, file)
      allChunks.push(...chunks)

      console.log(`[RAG Loader] Processed ${file}: ${chunks.length} chunks`)
    }

    cachedChunks = allChunks
    console.log(`[RAG Loader] Total chunks loaded: ${allChunks.length}`)
    
    return allChunks
  } catch (error) {
    console.error('[RAG Loader] Failed to load internal documentation:', error)
    return []
  }
}

/**
 * Chunk markdown content by headings for better semantic retrieval
 */
function chunkDocument(content: string, filename: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const lines = content.split('\n')
  
  let currentChunk: string[] = []
  let currentSection: string | undefined

  for (const line of lines) {
    // Detect heading (# or ##)
    if (line.startsWith('#')) {
      // Save previous chunk if exists
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n').trim(),
          metadata: {
            source: filename,
            section: currentSection
          }
        })
        currentChunk = []
      }
      
      // Extract section title
      currentSection = line.replace(/^#+\s*/, '').trim()
      currentChunk.push(line)
    } else {
      currentChunk.push(line)
    }

    // If chunk is getting too large (>1000 chars), split it
    if (currentChunk.join('\n').length > 1000 && currentChunk.length > 10) {
      chunks.push({
        content: currentChunk.join('\n').trim(),
        metadata: {
          source: filename,
          section: currentSection
        }
      })
      currentChunk = []
    }
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n').trim(),
      metadata: {
        source: filename,
        section: currentSection
      }
    })
  }

  return chunks.filter(c => c.content.length > 50) // Filter out very short chunks
}

/**
 * Query internal documentation using simple keyword matching
 * In production, this would use vector similarity search
 */
export async function queryInternalDocs(query: string, limit: number = 5): Promise<DocumentChunk[]> {
  try {
    // Load documentation if not cached
    const chunks = await loadInternalDocumentation()

    if (chunks.length === 0) {
      console.warn('[RAG Query] No documentation loaded')
      return []
    }

    // Simple keyword scoring (replace with semantic similarity in production)
    const scoredChunks = chunks.map(chunk => ({
      chunk,
      score: scoreChunk(chunk.content, query)
    }))

    // Sort by score and return top results
    return scoredChunks
      .filter(sc => sc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(sc => sc.chunk)

  } catch (error) {
    console.error('[RAG Query] Failed to query internal docs:', error)
    return []
  }
}

/**
 * Simple keyword-based scoring (replace with cosine similarity in production)
 */
function scoreChunk(content: string, query: string): number {
  const contentLower = content.toLowerCase()
  const queryWords = query.toLowerCase().split(/\s+/)
  
  let score = 0
  for (const word of queryWords) {
    if (word.length < 3) continue // Skip short words
    const count = (contentLower.match(new RegExp(word, 'g')) || []).length
    score += count
  }

  return score
}
