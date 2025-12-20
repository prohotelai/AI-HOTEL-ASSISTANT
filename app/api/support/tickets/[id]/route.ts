export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { updateSupportTicketSchema, type UpdateSupportTicketInput } from '@/lib/validation/supportTickets'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * PATCH /api/support/tickets/[id]
 * Update a support ticket (status, resolution, etc.)
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hotelId = token.hotelId as string
    const userId = token.id as string
    const ticketId = params.id

    // Check if ticket exists and belongs to this hotel
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { hotelId: true, status: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validated = updateSupportTicketSchema.parse(body) as UpdateSupportTicketInput

    // Prepare update data
    const updateData: any = {}
    
    if (validated.subject !== undefined) {
      updateData.subject = validated.subject
    }
    if (validated.issue !== undefined) {
      updateData.issue = validated.issue
    }
    if (validated.status !== undefined) {
      updateData.status = validated.status
      
      // If status is RESOLVED or CLOSED, set resolvedAt and resolvedBy
      if (validated.status === 'RESOLVED' || validated.status === 'CLOSED') {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = userId
      }
    }
    if (validated.priority !== undefined) {
      updateData.priority = validated.priority
    }
    if (validated.resolution !== undefined) {
      updateData.resolution = validated.resolution
    }
    if (validated.metadata !== undefined) {
      updateData.metadata = validated.metadata
    }

    // Update ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        subject: updatedTicket.subject,
        status: updatedTicket.status,
        priority: updatedTicket.priority,
        resolution: updatedTicket.resolution,
        resolvedAt: updatedTicket.resolvedAt,
        createdAt: updatedTicket.createdAt,
        updatedAt: updatedTicket.updatedAt,
        user: updatedTicket.user,
      },
      message: 'Support ticket updated successfully',
    })
  } catch (error: any) {
    console.error('[Support Tickets API] PATCH error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update support ticket' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/support/tickets/[id]
 * Delete/close a support ticket
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hotelId = token.hotelId as string
    const ticketId = params.id

    // Check if ticket exists and belongs to this hotel
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { hotelId: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete ticket (hard delete for now)
    // Alternative: soft delete by updating status to CLOSED
    await prisma.supportTicket.delete({
      where: { id: ticketId },
    })

    return NextResponse.json({
      success: true,
      message: 'Support ticket deleted successfully',
    })
  } catch (error: any) {
    console.error('[Support Tickets API] DELETE error:', error)

    return NextResponse.json(
      { error: 'Failed to delete support ticket' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/support/tickets/[id]
 * Get a single support ticket by ID
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hotelId = token.hotelId as string
    const ticketId = params.id

    // Fetch ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
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

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        issue: ticket.issue,
        status: ticket.status,
        priority: ticket.priority,
        resolution: ticket.resolution,
        resolvedAt: ticket.resolvedAt,
        resolvedBy: ticket.resolvedBy,
        metadata: ticket.metadata,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        user: ticket.user,
      },
    })
  } catch (error: any) {
    console.error('[Support Tickets API] GET error:', error)

    return NextResponse.json(
      { error: 'Failed to fetch support ticket' },
      { status: 500 }
    )
  }
}
