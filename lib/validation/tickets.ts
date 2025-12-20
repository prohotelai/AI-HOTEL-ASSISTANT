import { z } from 'zod'

export const ticketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED', 'CLOSED', 'CANCELLED'])
export const ticketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const ticketSourceEnum = z.enum(['GUEST_WIDGET', 'STAFF_PORTAL', 'AI_AGENT', 'WHATSAPP', 'PMS', 'MANUAL', 'EMAIL', 'PHONE'])
export const ticketCommentVisibilityEnum = z.enum(['PUBLIC', 'INTERNAL'])

export const createTicketSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().max(5000).optional(),
  priority: ticketPriorityEnum.default('MEDIUM'),
  status: ticketStatusEnum.default('OPEN'),
  source: ticketSourceEnum.default('STAFF_PORTAL'),
  assignedToId: z.string().cuid().optional().nullable(),
  guestName: z.string().max(120).optional(),
  guestEmail: z.string().email().optional(),
  guestRoom: z.string().max(40).optional(),
  tags: z.array(z.string().cuid()).optional().default([]),
  slaMinutes: z.number().int().min(5).max(2880).optional(),
  dueAt: z.string().datetime().optional(),
})

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  description: z.string().max(5000).optional(),
  priority: ticketPriorityEnum.optional(),
  status: ticketStatusEnum.optional(),
  assignedToId: z.string().cuid().nullable().optional(),
  tags: z.array(z.string().cuid()).optional(),
  slaMinutes: z.number().int().min(5).max(2880).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

export const commentSchema = z.object({
  body: z.string().min(1).max(4000),
  visibility: ticketCommentVisibilityEnum.default('PUBLIC'),
})

export const ticketListQuerySchema = z.object({
  status: z
    .union([ticketStatusEnum, z.literal('ALL')])
    .optional()
    .transform((val) => (val === 'ALL' ? undefined : val)),
  priority: ticketPriorityEnum.optional(),
  search: z.string().max(120).optional(),
  assignedTo: z.string().cuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Math.min(Math.max(Number(value), 1), 100) : 20)),
  cursor: z.string().optional(),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CommentInput = z.infer<typeof commentSchema>
