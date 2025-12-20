import { Queue, Worker, JobsOptions } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { differenceInMinutes, isAfter } from 'date-fns'

const redisUrl = process.env.REDIS_URL

const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : undefined

export const ticketAutomationQueue = connection
  ? new Queue('ticket-automation', { connection })
  : undefined

// Worker handles delayed jobs automatically in BullMQ v3+
// Ticket model not in schema - worker stubbed
/* if (connection && process.env.NEXT_RUNTIME !== 'edge') {
  if (process.env.RUN_QUEUE_WORKER === 'true') {
    // Worker to process automation jobs (escalations, AI summaries, SLA etc.)
    new Worker(
      'ticket-automation',
      async (job) => {
        if (job.name === 'sla-check') {
          const { ticketId } = job.data as { ticketId: string }
          const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { id: true, hotelId: true, status: true, slaMinutes: true, createdAt: true, escalationLevel: true }
          })

          if (!ticket || !ticket.slaMinutes) return

          const elapsed = differenceInMinutes(new Date(), ticket.createdAt)
          if (elapsed > ticket.slaMinutes && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
            await prisma.ticket.update({
              where: { id: ticketId },
              data: {
                escalationLevel: ticket.escalationLevel + 1,
                audits: {
                  create: {
                    action: 'SLA_ESCALATION',
                    payload: { elapsedMinutes: elapsed },
                  }
                }
              }
            })

            eventBus.emit('tickets.escalated', {
              ticketId,
              hotelId: ticket.hotelId,
              level: ticket.escalationLevel + 1,
            })
          }
        }

        if (job.name === 'ai-summary') {
          const { ticketId } = job.data as { ticketId: string }
          await prisma.ticketAutomationRun.create({
            data: {
              ticketId,
              type: 'AI_SUMMARY',
              status: 'PENDING',
            }
          })
        }
      },
      { connection }
    )
  }
} */

export async function scheduleSlaAutomation(ticketId: string, slaMinutes?: number | null) {
  if (!ticketAutomationQueue || !slaMinutes) {
    return
  }

  const delay = Math.max(slaMinutes * 60 * 1000, 1_000)
  const options: JobsOptions = {
    delay,
    removeOnComplete: true,
    removeOnFail: true,
  }

  await ticketAutomationQueue.add('sla-check', { ticketId }, options)
}

export async function scheduleAiSummaryJob(ticketId: string) {
  if (!ticketAutomationQueue) {
    return
  }

  await ticketAutomationQueue.add('ai-summary', { ticketId }, { removeOnComplete: true, removeOnFail: true })
}

export function isTicketOverdue(slaMinutes: number | null | undefined, createdAt: Date, status: string) {
  if (!slaMinutes) return false
  if (status === 'RESOLVED' || status === 'CLOSED') return false
  const dueDate = new Date(createdAt.getTime() + slaMinutes * 60 * 1000)
  return isAfter(new Date(), dueDate)
}
