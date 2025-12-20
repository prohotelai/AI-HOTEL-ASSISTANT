import { describe, it, expect } from 'vitest'
import {
  createSourceSchema,
  ingestDocumentSchema,
  knowledgeBaseDocumentStatusEnum,
  chunkingOptionsSchema,
} from '@/lib/validation/knowledgeBase'

describe('knowledge base validation', () => {
  it('validates source creation with defaults', () => {
    const result = createSourceSchema.parse({
      name: 'Manual Uploads',
      type: 'MANUAL_UPLOAD',
    })

    expect(result.status).toBeUndefined()
    expect(result.syncIntervalMinutes).toBeUndefined()
  })

  it('requires content or storage path for document ingestion', () => {
    expect(() => ingestDocumentSchema.parse({
      title: 'Hotel FAQ',
      description: 'Frequently asked questions',
      language: 'en',
    })).toThrow()

    const result = ingestDocumentSchema.parse({
      title: 'FAQ',
      content: 'Q: Check-in time? A: 3pm',
    })

    expect(result.content).toBeDefined()
    expect(result.checksum).toBeUndefined()
  })

  it('parses document status enums and chunking options', () => {
    expect(knowledgeBaseDocumentStatusEnum.parse('READY')).toBe('READY')

    const options = chunkingOptionsSchema.parse({ chunkSize: 600, chunkOverlap: 80 })
    expect(options.chunkSize).toBe(600)
    expect(options.chunkOverlap).toBe(80)
  })
})
