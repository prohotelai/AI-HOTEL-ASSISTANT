import { describe, it, expect } from 'vitest'
import { rankChunks, formatRetrievedChunks } from '@/lib/ai/retrieval'

const baseDate = new Date('2025-12-11T10:00:00.000Z')

describe('knowledge retrieval ranking', () => {
  it('prioritizes chunks that contain more query terms and recent updates', () => {
    const query = 'late checkout policy'
    const chunks = [
      {
        id: 'a',
        documentId: 'doc-1',
        sequence: 0,
        content: 'Our standard checkout time is at 11 AM. Late checkouts may incur a fee.',
        tokenCount: 80,
        document: {
          id: 'doc-1',
          title: 'Guest Policies',
          description: null,
          language: 'en',
          updatedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 12),
        },
      },
      {
        id: 'b',
        documentId: 'doc-2',
        sequence: 0,
        content: 'Breakfast is served from 6 AM to 10 AM daily.',
        tokenCount: 60,
        document: {
          id: 'doc-2',
          title: 'Dining',
          description: null,
          language: 'en',
          updatedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 4),
        },
      },
      {
        id: 'c',
        documentId: 'doc-3',
        sequence: 0,
        content: 'Guests can request late checkout by contacting reception before 9 AM.',
        tokenCount: 90,
        document: {
          id: 'doc-3',
          title: 'Front Desk Procedures',
          description: null,
          language: 'en',
          updatedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 48),
        },
      },
    ]

    const ranked = rankChunks(query, chunks)

    expect(ranked[0].id).toBe('a')
    expect(ranked[1].id).toBe('c')
    expect(ranked[2].id).toBe('b')
    expect(ranked[0].score).toBeGreaterThan(ranked[2].score)
  })

  it('formats selected chunks into readable context blocks', () => {
    const chunks = rankChunks('checkout', [
      {
        id: 'z',
        documentId: 'doc-z',
        sequence: 0,
        content: 'Checkout is 11 AM.',
        tokenCount: 20,
        document: {
          id: 'doc-z',
          title: 'Summary',
          description: null,
          language: 'en',
          updatedAt: baseDate,
        },
      },
    ])

    const formatted = formatRetrievedChunks(chunks)
    expect(formatted).toContain('Document 1: Summary')
    expect(formatted).toContain('Checkout is 11 AM.')
  })
})
