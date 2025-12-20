import { describe, it, expect } from 'vitest'
import { generateChunks } from '@/lib/knowledgeBase/chunker'

describe('knowledge base chunker', () => {
  it('creates overlapping chunks with stable lengths', () => {
    const content = 'A'.repeat(1200)
    const chunks = generateChunks(content, { chunkSize: 400, chunkOverlap: 100 })

    expect(chunks).toHaveLength(4)
    expect(chunks[0].content.length).toBe(400)
    expect(chunks[1].content.length).toBe(400)
    expect(chunks[1].content.slice(0, 100)).toBe(chunks[0].content.slice(300))
  })

  it('skips empty content and trims whitespace', () => {
    const chunks = generateChunks('\n\n   \n')
    expect(chunks).toEqual([])
  })

  it('provides token estimate for each chunk', () => {
    const content = 'Word '.repeat(200)
    const chunks = generateChunks(content, { chunkSize: 300, chunkOverlap: 0 })

    expect(chunks[0].tokenEstimate).toBeGreaterThan(0)
    expect(chunks[0].sequence).toBe(0)
  })
})
