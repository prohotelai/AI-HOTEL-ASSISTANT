import { prisma } from '@/lib/prisma'
import { format, startOfMonth, subMonths } from 'date-fns'

// Import actual enums from Prisma types
import type { BookingStatus, TicketStatus, TicketPriority } from '@prisma/client'

type ChartDatum = {
  label: string
  value: number
}

type BookingTrendPoint = {
  month: string
  bookings: number
}

type StaffRow = {
  id: string
  name: string | null
  email: string
  role: string
  joinedAt: string
}

type BookingRow = {
  id: string
  guestName: string
  status: BookingStatus
  checkIn: string
  checkOut: string
  roomNumber: string | null
  totalAmount: number | null
  currency: string | null
}

type TicketRow = {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
}

type KnowledgeDocumentRow = {
  id: string
  title: string
  status: string // Using string since KnowledgeBaseChunk doesn't have status
  updatedAt: string
}


type HotelSummary = {
  id: string
  name: string
  slug: string
  createdAt: string
}

type AdminMetrics = {
  totalStaff: number
  totalBookings: number
  activeBookings: number
  openTickets: number
  totalTickets: number
  knowledgeDocuments: number
  readyDocuments: number
}

export type AdminDashboardData = {
  hotel: HotelSummary
  metrics: AdminMetrics
  bookingTrend: BookingTrendPoint[]
  ticketStatusBreakdown: ChartDatum[]
  knowledgeStatusBreakdown: ChartDatum[]
  staff: StaffRow[]
  bookings: BookingRow[]
  tickets: TicketRow[]
  knowledgeBaseDocuments: KnowledgeDocumentRow[]
}

type BookingLike = { checkIn: Date; status: BookingStatus }
type TicketLike = { status: TicketStatus }
type KnowledgeDocLike = { status: string }

type TrendOptions = {
  months?: number
}

const TICKET_ACTIVE_STATUSES = new Set<TicketStatus>([
  'OPEN' as TicketStatus,
  'IN_PROGRESS' as TicketStatus,
  'WAITING_RESPONSE' as TicketStatus,
])

const BOOKING_ACTIVE_STATUSES = new Set<BookingStatus>([
  'PENDING' as BookingStatus,
  'CONFIRMED' as BookingStatus,
  'CHECKED_IN' as BookingStatus,
])

const KNOWLEDGE_STATUS_VALUES = ['READY', 'PENDING', 'PROCESSING', 'FAILED', 'ARCHIVED']
const TICKET_STATUS_VALUES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_RESPONSE',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
] as const

export function buildBookingTrend(bookings: BookingLike[], options: TrendOptions = {}): BookingTrendPoint[] {
  const months = options.months ?? 6
  const now = startOfMonth(new Date())
  const buckets: { key: string; label: string; count: number }[] = []

  for (let i = months - 1; i >= 0; i -= 1) {
    const bucketDate = subMonths(now, i)
    buckets.push({
      key: bucketDate.toISOString(),
      label: format(bucketDate, 'MMM yyyy'),
      count: 0,
    })
  }

  bookings.forEach((booking) => {
    const monthKey = startOfMonth(booking.checkIn).toISOString()
    const bucket = buckets.find((entry) => entry.key === monthKey)
    if (bucket) {
      bucket.count += 1
    }
  })

  return buckets.map((bucket) => ({ month: bucket.label, bookings: bucket.count }))
}

export function summarizeTicketStatuses(tickets: TicketLike[]): ChartDatum[] {
  return TICKET_STATUS_VALUES.map((status) => ({
    label: status,
    value: tickets.filter((ticket) => ticket.status === status).length,
  }))
}

export function summarizeKnowledgeStatuses(docs: KnowledgeDocLike[]): ChartDatum[] {
  return KNOWLEDGE_STATUS_VALUES.map((status) => ({
    label: status,
    value: docs.filter((doc) => doc.status === status).length,
  }))
}

export async function getAdminDashboardData(hotelId: string): Promise<AdminDashboardData> {
  const [hotel, staff, tickets, bookings, knowledgeBaseDocuments] = await Promise.all([
    prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.ticket.findMany({
      where: { hotelId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { hotelId },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        totalAmount: true,
        currency: true,
        guest: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        room: {
          select: {
            roomNumber: true,
          },
        },
      },
      orderBy: { checkInDate: 'desc' },
      take: 10,
    }),
    prisma.knowledgeBaseChunk.findMany({
      where: { hotelId },
      select: {
        id: true,
        metadata: true,
        updatedAt: true,
      },
      take: 10,
    }),
  ])

  if (!hotel) {
    const error = new Error('Hotel not found')
    ;(error as any).status = 404
    throw error
  }

  const activeTicketCount = tickets.filter((ticket) => TICKET_ACTIVE_STATUSES.has(ticket.status)).length
  const activeBookingCount = bookings.filter((booking) => BOOKING_ACTIVE_STATUSES.has(booking.status)).length

  const metrics: AdminMetrics = {
    totalStaff: staff.length,
    totalBookings: bookings.length,
    activeBookings: activeBookingCount,
    openTickets: activeTicketCount,
    totalTickets: tickets.length,
    knowledgeDocuments: knowledgeBaseDocuments.length,
    readyDocuments: 0, // Knowledge base chunks don't have a status field
  }

  const bookingTrend = buildBookingTrend(
    bookings.map((b) => ({
      checkIn: b.checkInDate,
      status: b.status,
    }))
  )
  
  const ticketStatusBreakdown = summarizeTicketStatuses(tickets)
  const knowledgeStatusBreakdown = summarizeKnowledgeStatuses(
    knowledgeBaseDocuments.map((doc) => ({
      status: (doc.metadata as any)?.status || 'READY',
    }))
  )

  return {
    hotel: {
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      createdAt: hotel.createdAt.toISOString(),
    },
    metrics,
    bookingTrend,
    ticketStatusBreakdown,
    knowledgeStatusBreakdown,
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name ?? null,
      email: member.email,
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    })),
    bookings: bookings.map((booking) => ({
      id: booking.id,
      guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      status: booking.status,
      checkIn: booking.checkInDate.toISOString(),
      checkOut: booking.checkOutDate.toISOString(),
      roomNumber: booking.room?.roomNumber ?? null,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
    })),
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
    })),
    knowledgeBaseDocuments: knowledgeBaseDocuments.map((doc) => ({
      id: doc.id,
      title: (doc.metadata as any)?.title || 'Untitled',
      status: (doc.metadata as any)?.status || 'READY',
      updatedAt: doc.updatedAt.toISOString(),
    })),
  }
}
