export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import {
  createSupportTicketSchema,
  listSupportTicketsSchema,
  type CreateSupportTicketInput,
  type ListSupportTicketsQuery,
} from '@/lib/validation/supportTickets'

/**
 * POST /api/support/tickets
 * Create a new support ticket (requires paid plan with supportEnabled)
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hotelId = token.hotelId as string
    const userId = token.id as string

    // Check if support is enabled for this hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { supportEnabled: true, subscriptionPlan: true },
    })

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }

    if (!hotel.supportEnabled) {
      return NextResponse.json(
        {
          error: 'Support not available',
          message: 'Please upgrade to a paid plan to access 24/7 technical support',
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validated = createSupportTicketSchema.parse(body) as CreateSupportTicketInput

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        hotelId,
        userId,
        subject: validated.subject,
        issue: validated.issue,
        priority: validated.priority,
        metadata: (validated.metadata as any) || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          user: ticket.user,
        },
        message: 'Support ticket created successfully. Our team will respond within 24 hours.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Support Tickets API] POST error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/support/tickets
 * List support tickets with filters and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hotelId = token.hotelId as string

    // Check if support is enabled
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { supportEnabled: true },
    })

    if (!hotel?.supportEnabled) {
      return NextResponse.json(
        { error: 'Support not available', upgradeRequired: true },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = req.nextUrl
    const query = listSupportTicketsSchema.parse({
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    }) as ListSupportTicketsQuery

    // Build where clause
    const where: any = { hotelId }
    if (query.status) {
      where.status = query.status
    }
    if (query.priority) {
      where.priority = query.priority
    }

    // Pagination
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    // Fetch tickets with pagination
    const [tickets, totalCount] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // URGENT first
          { createdAt: 'desc' }, // Newest first
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        user: ticket.user,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('[Support Tickets API] GET error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}
