type ChunkOptions = {
  chunkSize?: number
  chunkOverlap?: number
}

export type GeneratedChunk = {
  sequence: number
  content: string
  tokenEstimate: number
}

const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_CHUNK_OVERLAP = 120

export function generateChunks(rawContent: string, options: ChunkOptions = {}): GeneratedChunk[] {
  const content = rawContent.replace(/\r\n/g, '\n').trim()
  if (!content) return []

  const chunkSize = Math.max(options.chunkSize ?? DEFAULT_CHUNK_SIZE, 200)
  const chunkOverlap = Math.min(options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, Math.floor(chunkSize * 0.75))

  const chunks: GeneratedChunk[] = []
  let start = 0
  let sequence = 0

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length)
    const slice = content.slice(start, end).trim()

    if (slice.length > 0) {
      const tokenEstimate = estimateTokenCount(slice)
      chunks.push({
        sequence,
        content: slice,
        tokenEstimate,
      })
      sequence += 1
    }

    if (end >= content.length) {
      break
    }

    start = Math.max(end - chunkOverlap, start + 1)
  }

  return chunks
}

function estimateTokenCount(text: string) {
  const words = text.trim().split(/\s+/)
  return Math.max(Math.ceil(words.length * 0.75), 1)
}
