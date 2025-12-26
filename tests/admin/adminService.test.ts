import { describe, expect, it } from 'vitest'
import { BookingStatus, TicketStatus } from '@prisma/client'
import {
  buildBookingTrend,
  summarizeKnowledgeStatuses,
  summarizeTicketStatuses,
} from '@/lib/services/adminService'

describe('adminService helpers', () => {
  it('buildBookingTrend buckets bookings by month', () => {
    const now = new Date()
    const lastMonth = new Date(now)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const trend = buildBookingTrend(
      [
        { checkIn: now, status: BookingStatus.CONFIRMED },
        { checkIn: now, status: BookingStatus.CONFIRMED },
        { checkIn: lastMonth, status: BookingStatus.PENDING },
      ],
      { months: 2 }
    )

    expect(trend).toHaveLength(2)
    expect(trend[1]?.bookings).toBe(2)
    expect(trend[0]?.bookings).toBe(1)
  })

  it('summarizeTicketStatuses returns counts by status', () => {
    const summary = summarizeTicketStatuses([
      { status: TicketStatus.OPEN },
      { status: TicketStatus.OPEN },
      { status: TicketStatus.RESOLVED },
    ])

    const openRow = summary.find((row) => row.label === TicketStatus.OPEN)
    const resolvedRow = summary.find((row) => row.label === TicketStatus.RESOLVED)

    expect(openRow?.value).toBe(2)
    expect(resolvedRow?.value).toBe(1)
  })

  it('summarizeKnowledgeStatuses returns zero for missing statuses', () => {
    const summary = summarizeKnowledgeStatuses([
      { status: 'READY' },
    ])

    const ready = summary.find((row) => row.label === 'READY')
    const failed = summary.find((row) => row.label === 'FAILED')

    expect(ready?.value).toBe(1)
    expect(failed?.value).toBe(0)
  })
})
