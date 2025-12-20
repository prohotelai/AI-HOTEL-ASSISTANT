import { prisma } from '@/lib/prisma'
import { format, startOfMonth, subMonths } from 'date-fns'

// Stubbed - Booking model not in schema
enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

// Stubbed - Ticket model not in schema
enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// Stubbed - KnowledgeBase model not in schema
enum KnowledgeBaseDocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

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
  status: KnowledgeBaseDocumentStatus
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
type KnowledgeDocLike = { status: KnowledgeBaseDocumentStatus }

type TrendOptions = {
  months?: number
}

const TICKET_ACTIVE_STATUSES = new Set<TicketStatus>([
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.ON_HOLD,
])

const BOOKING_ACTIVE_STATUSES = new Set<BookingStatus>([
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
])

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
  return Object.values(TicketStatus).map((status) => ({
    label: status,
    value: tickets.filter((ticket) => ticket.status === status).length,
  }))
}

export function summarizeKnowledgeStatuses(docs: KnowledgeDocLike[]): ChartDatum[] {
  return Object.values(KnowledgeBaseDocumentStatus).map((status) => ({
    label: status,
    value: docs.filter((doc) => doc.status === status).length,
  }))
}

export async function getAdminDashboardData(hotelId: string): Promise<AdminDashboardData> {
  const [hotel, staff] = await Promise.all([
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
  ])
  
  // Booking, ticket, and knowledge base models not yet implemented
  const tickets: any[] = []
  const bookings: BookingLike[] = []
  const knowledgeBaseDocuments: KnowledgeDocLike[] = []

  if (!hotel) {
    const error = new Error('Hotel not found')
    ;(error as any).status = 404
    throw error
  }

  const activeTicketCount = tickets.filter((ticket) => TICKET_ACTIVE_STATUSES.has(ticket.status)).length
  const activeBookingCount = bookings.filter((booking) => BOOKING_ACTIVE_STATUSES.has(booking.status)).length
  const readyDocumentCount = knowledgeBaseDocuments.filter(
    (doc) => doc.status === KnowledgeBaseDocumentStatus.READY
  ).length

  const metrics: AdminMetrics = {
    totalStaff: staff.length,
    totalBookings: bookings.length,
    activeBookings: activeBookingCount,
    openTickets: activeTicketCount,
    totalTickets: tickets.length,
    knowledgeDocuments: knowledgeBaseDocuments.length,
    readyDocuments: readyDocumentCount,
  }

  const bookingTrend = buildBookingTrend(bookings)
  const ticketStatusBreakdown = summarizeTicketStatuses(tickets)
  const knowledgeStatusBreakdown = summarizeKnowledgeStatuses(knowledgeBaseDocuments)

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
    bookings: [], // Booking model not implemented
    tickets: [], // Ticket model not implemented
    knowledgeBaseDocuments: [], // KnowledgeBase model not implemented
  }
}
