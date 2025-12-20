import { describe, it, expect } from 'vitest'
import { commentSchema, createTicketSchema, ticketListQuerySchema, updateTicketSchema } from '@/lib/validation/tickets'

describe('tickets validation schemas', () => {
  it('applies defaults when creating a ticket', () => {
    const result = createTicketSchema.parse({
      title: 'Leaky faucet in room 204',
      description: 'Guest reported constant dripping.',
    })

    expect(result.status).toBe('OPEN')
    expect(result.priority).toBe('MEDIUM')
    expect(result.source).toBe('STAFF_PORTAL')
    expect(result.tags).toEqual([])
  })

  it('normalizes filter query params', () => {
    const result = ticketListQuerySchema.parse({
      status: 'ALL',
      limit: '250',
      search: 'noise',
    })

    expect(result.status).toBeUndefined()
    expect(result.limit).toBe(100)
    expect(result.search).toBe('noise')
  })

  it('supports nullable updates and comment defaults', () => {
    const update = updateTicketSchema.parse({
      slaMinutes: null,
      assignedToId: null,
      dueAt: null,
    })

    expect(update.slaMinutes).toBeNull()
    expect(update.assignedToId).toBeNull()
    expect(update.dueAt).toBeNull()

    const comment = commentSchema.parse({ body: 'Engineer dispatched.' })
    expect(comment.visibility).toBe('PUBLIC')
  })
})
