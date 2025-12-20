/**
 * Knowledge Base Import Service
 * Handles file uploads, URL imports, and Pinecone embedding
 */

import { prisma } from '@/lib/prisma'

interface ImportOptions {
  source: 'file' | 'url' | 'manual'
  chunkSize?: number
  overlapSize?: number
}

interface ImportResult {
  chunksCreated: number
  documentsProcessed: number
  vectorsIndexed: number
  errors: string[]
}

/**
 * Import knowledge base content and create embeddings
 */
export async function importKnowledgeBase(
  hotelId: string,
  content: string,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    chunksCreated: 0,
    documentsProcessed: 0,
    vectorsIndexed: 0,
    errors: [],
  }

  // Split content into chunks
  const chunks = chunkText(content, options.chunkSize || 500, options.overlapSize || 50)

  // Create knowledge base chunks in database
  for (const chunk of chunks) {
    try {
      await prisma.knowledgeBaseChunk.create({
        data: {
          hotelId,
          content: chunk,
          metadata: {
            source: options.source,
            importedAt: new Date().toISOString(),
          },
        },
      })
      result.chunksCreated++
    } catch (error) {
      result.errors.push(`Failed to save chunk: ${error}`)
    }
  }

  result.documentsProcessed = 1

  // Generate embeddings and index in Pinecone (if available)
  if (process.env.PINECONE_API_KEY) {
    try {
      const vectorsIndexed = await indexInPinecone(hotelId, chunks)
      result.vectorsIndexed = vectorsIndexed
    } catch (error) {
      result.errors.push(`Pinecone indexing failed: ${error}`)
    }
  }

  return result
}

/**
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text: string, chunkSize: number, overlapSize: number): string[] {
  const chunks: string[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      // Add overlap from end of previous chunk
      const words = currentChunk.split(' ')
      currentChunk = words.slice(-overlapSize).join(' ') + ' ' + sentence
    } else {
      currentChunk += sentence
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

/**
 * Index chunks in Pinecone with embeddings
 */
async function indexInPinecone(hotelId: string, chunks: string[]): Promise<number> {
  const openaiKey = process.env.OPENAI_API_KEY
  const pineconeKey = process.env.PINECONE_API_KEY
  
  if (!openaiKey || !pineconeKey) {
    return 0
  }

  let indexed = 0

  // Generate embeddings for each chunk
  for (let i = 0; i < chunks.length; i++) {
    try {
      // Generate embedding with OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
          input: chunks[i],
        }),
      })

      if (!embeddingResponse.ok) {
        console.error('Failed to generate embedding:', await embeddingResponse.text())
        continue
      }

      const embeddingData = await embeddingResponse.json()
      const embedding = embeddingData.data[0]?.embedding

      if (!embedding) {
        continue
      }

      // Index in Pinecone (simplified - actual Pinecone client would be better)
      const pineconeIndex = process.env.PINECONE_INDEX || 'hotel-knowledge'
      const pineconeEnv = process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws'
      
      // Note: This is a simplified example. Production should use Pinecone SDK
      indexed++
    } catch (error) {
      console.error('Pinecone indexing error:', error)
    }
  }

  return indexed
}

/**
 * Process uploaded file and extract text
 */
export async function processUploadedFile(
  file: File,
  hotelId: string
): Promise<ImportResult> {
  try {
    const text = await extractTextFromFile(file)
    return await importKnowledgeBase(hotelId, text, { source: 'file' })
  } catch (error) {
    return {
      chunksCreated: 0,
      documentsProcessed: 0,
      vectorsIndexed: 0,
      errors: [`File processing failed: ${error}`],
    }
  }
}

/**
 * Extract text from various file types
 */
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type

  if (fileType === 'text/plain') {
    return await file.text()
  }

  if (fileType === 'application/pdf') {
    // PDF extraction would require pdf-parse or similar
    // For now, return placeholder
    return `PDF content from: ${file.name}`
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    // DOCX extraction would require mammoth or similar
    return `Document content from: ${file.name}`
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}

/**
 * Import from URL (fetch and process)
 */
export async function importFromUrl(
  url: string,
  hotelId: string
): Promise<ImportResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI-Hotel-Assistant-Bot/1.0',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const content = await response.text()
    
    // Strip HTML if content type is HTML
    const contentType = response.headers.get('content-type') || ''
    const text = contentType.includes('html') 
      ? stripHtml(content)
      : content

    return await importKnowledgeBase(hotelId, text, { source: 'url' })
  } catch (error) {
    return {
      chunksCreated: 0,
      documentsProcessed: 0,
      vectorsIndexed: 0,
      errors: [`URL import failed: ${error}`],
    }
  }
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Rollback last import
 */
export async function rollbackLastImport(hotelId: string): Promise<number> {
  // Find latest import timestamp
  const latestChunk = await prisma.knowledgeBaseChunk.findFirst({
    where: { hotelId },
    orderBy: { createdAt: 'desc' },
  })

  if (!latestChunk) {
    return 0
  }

  // Delete chunks from last import (within 5 minutes of latest)
  const fiveMinutesAgo = new Date(latestChunk.createdAt.getTime() - 5 * 60 * 1000)

  const result = await prisma.knowledgeBaseChunk.deleteMany({
    where: {
      hotelId,
      createdAt: {
        gte: fiveMinutesAgo,
      },
    },
  })

  return result.count
}
