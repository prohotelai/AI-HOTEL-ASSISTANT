import { z } from 'zod'

export const createSupportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject too long'),
  issue: z.string().min(20, 'Please describe the issue in detail (minimum 20 characters)').max(5000, 'Issue description too long'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateSupportTicketSchema = z.object({
  subject: z.string().min(5).max(200).optional(),
  issue: z.string().min(20).max(5000).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  resolution: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const listSupportTicketsSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(Number),
})

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>
export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>
export type ListSupportTicketsQuery = z.infer<typeof listSupportTicketsSchema>
