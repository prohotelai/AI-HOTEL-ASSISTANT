import { prisma } from '@/lib/prisma'
import { commentSchema, createTicketSchema, ticketListQuerySchema, updateTicketSchema } from '@/lib/validation/tickets'
import { scheduleAiSummaryJob, scheduleSlaAutomation } from '@/lib/queues/ticketQueues'
import { eventBus } from '@/lib/events/eventBus'
import { Prisma } from '@prisma/client'

export type TicketListQuery = Omit<ReturnType<typeof ticketListQuerySchema['parse']>, 'limit'> & {
  limit?: number
  cursor?: string
}

const ticketSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  source: true,
  guestName: true,
  guestEmail: true,
  guestRoom: true,
  createdAt: true,
  updatedAt: true,
  dueAt: true,
  slaMinutes: true,
  escalationLevel: true,
  conversationId: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    }
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          color: true,
        }
      }
    }
  },
  _count: {
    select: {
      comments: true,
    }
  }
} as const

export async function listTickets(hotelId: string, query: URLSearchParams) {
  const parsed = ticketListQuerySchema.parse(Object.fromEntries(query))
  const limit = parsed.limit ?? 20

  const where: Prisma.TicketWhereInput = {
    hotelId,
  }

  if (parsed.status) {
    where.status = parsed.status
  }

  if (parsed.priority) {
    where.priority = parsed.priority
  }

  if (parsed.assignedTo) {
    where.assignedToId = parsed.assignedTo
  }

  if (parsed.search) {
    where.OR = [
      { title: { contains: parsed.search, mode: 'insensitive' } },
      { description: { contains: parsed.search, mode: 'insensitive' } },
      { guestName: { contains: parsed.search, mode: 'insensitive' } },
    ]
  }

  const tickets = await prisma.ticket.findMany({
    where,
    select: ticketSelect,
    take: limit + 1,
    orderBy: { createdAt: 'desc' },
    cursor: parsed.cursor ? { id: parsed.cursor } : undefined,
  })

  const hasMore = tickets.length > limit
  const items = hasMore ? tickets.slice(0, -1) : tickets

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  }
}

export async function getTicket(hotelId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, hotelId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      source: true,
      guestName: true,
      guestEmail: true,
      guestRoom: true,
      createdAt: true,
      updatedAt: true,
      dueAt: true,
      slaMinutes: true,
      escalationLevel: true,
      conversationId: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            }
          }
        }
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          isInternal: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      },
      audits: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          payload: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }
    }
  })

  if (!ticket) {
    const error = new Error('Ticket not found')
    ;(error as any).status = 404
    throw error
  }

  return ticket
}

type CreateTicketContext = {
  hotelId: string
  userId: string
}

export async function createTicket(context: CreateTicketContext, input: unknown) {
  const payload = createTicketSchema.parse(input)

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        hotelId: context.hotelId,
        userId: context.userId,
        title: payload.title,
        description: payload.description || '',
        priority: payload.priority,
        status: payload.status,
        source: payload.source,
        assignedToId: payload.assignedToId ?? undefined,
        createdById: context.userId,
        guestEmail: payload.guestEmail,
        guestName: payload.guestName,
        guestRoom: payload.guestRoom,
        slaMinutes: payload.slaMinutes ?? null,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
        audits: {
          create: {
            actorId: context.userId,
            action: 'CREATED',
            payload: {
              title: payload.title,
              priority: payload.priority,
              status: payload.status,
            },
          },
        },
      },
      select: ticketSelect,
    })

    if (payload.tags?.length) {
      await tx.ticketTag.createMany({
        data: payload.tags.map((tagId) => ({
          ticketId: ticket.id,
          tagId,
          assignedById: context.userId,
        })),
        skipDuplicates: true,
      })
    }

    return ticket
  })

  await scheduleSlaAutomation(result.id, result.slaMinutes ?? undefined)
  await scheduleAiSummaryJob(result.id)

  eventBus.emit('tickets.created', {
    ticketId: result.id,
    hotelId: context.hotelId,
  })

  return result
}

type UpdateTicketContext = {
  hotelId: string
  userId: string
  ticketId: string
}

export async function updateTicket(context: UpdateTicketContext, input: unknown) {
  const payload = updateTicketSchema.parse(input)

  const existing = await prisma.ticket.findFirst({
    where: { id: context.ticketId, hotelId: context.hotelId },
    select: { id: true }
  })

  if (!existing) {
    const error = new Error('Ticket not found')
    ;(error as any).status = 404
    throw error
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: context.ticketId },
      data: {
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        priority: payload.priority ?? undefined,
        status: payload.status ?? undefined,
        assignedToId: payload.assignedToId === undefined ? undefined : payload.assignedToId,
        slaMinutes: payload.slaMinutes === undefined ? undefined : payload.slaMinutes,
        dueAt: payload.dueAt === undefined ? undefined : payload.dueAt ? new Date(payload.dueAt) : null,
        audits: {
          create: {
            actorId: context.userId,
            action: 'UPDATED',
            payload,
          }
        }
      },
      select: ticketSelect,
    })

    if (payload.tags) {
      await tx.ticketTag.deleteMany({ where: { ticketId: context.ticketId } })
      if (payload.tags.length) {
        await tx.ticketTag.createMany({
          data: payload.tags.map((tagId) => ({
            ticketId: context.ticketId,
            tagId,
            assignedById: context.userId,
          }))
        })
      }
    }

    return updated
  })

  eventBus.emit('tickets.updated', {
    ticketId: context.ticketId,
    hotelId: context.hotelId,
    changes: payload,
  })

  if (payload.slaMinutes) {
    await scheduleSlaAutomation(context.ticketId, payload.slaMinutes)
  }

  return ticket
}

type CommentContext = {
  hotelId: string
  userId: string
  ticketId: string
}

export async function addComment(context: CommentContext, input: unknown) {
  const payload = commentSchema.parse(input)

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: context.ticketId,
      hotelId: context.hotelId,
    },
    select: { id: true, hotelId: true },
  })

  if (!ticket) {
    const error = new Error('Ticket not found')
    ;(error as any).status = 404
    throw error
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: ticket.id,
      userId: context.userId,
      content: payload.body,
      isInternal: payload.visibility === 'INTERNAL',
    },
    select: {
      id: true,
      content: true,
      isInternal: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  })

  await prisma.ticketAudit.create({
    data: {
      ticketId: ticket.id,
      actorId: context.userId,
      action: payload.visibility === 'INTERNAL' ? 'INTERNAL_NOTE_ADDED' : 'COMMENT_ADDED',
      payload: {
        visibility: payload.visibility,
      },
    }
  })

  eventBus.emit('tickets.commented', {
    ticketId: ticket.id,
    hotelId: ticket.hotelId,
    visibility: payload.visibility,
  })

  return comment
}

export async function closeTicket(context: CommentContext) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: context.ticketId, hotelId: context.hotelId },
    select: { id: true, status: true, hotelId: true }
  })

  if (!ticket) {
    const error = new Error('Ticket not found')
    ;(error as any).status = 404
    throw error
  }

  const updated = await prisma.ticket.update({
    where: { id: context.ticketId },
    data: {
      status: 'CLOSED',
      resolvedAt: new Date(),
      resolvedBy: context.userId,
      audits: {
        create: {
          actorId: context.userId,
          action: 'CLOSED',
          payload: {},
        }
      }
    },
    select: ticketSelect,
  })

  eventBus.emit('tickets.updated', {
    ticketId: updated.id,
    hotelId: context.hotelId,
    changes: { status: 'CLOSED' },
  })

  return updated
}
