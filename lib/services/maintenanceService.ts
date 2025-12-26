/**
 * Maintenance Service - Phase 4
 * Manage maintenance tickets and room blocking
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { MaintenancePriority, MaintenanceStatus, RoomStatus } from '@prisma/client'

export interface CreateMaintenanceTicketInput {
  hotelId: string
  roomId?: string
  title: string
  description: string
  category: string // PLUMBING, ELECTRICAL, HVAC, FURNITURE, APPLIANCE, STRUCTURAL, OTHER
  priority?: MaintenancePriority
  reportedBy: string
  assignedTo?: string
  blocksRoom?: boolean
  estimatedCost?: number
}

export interface UpdateMaintenanceTicketInput {
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  assignedTo?: string
  resolution?: string
  actualCost?: number
  blocksRoom?: boolean
}

/**
 * Create maintenance ticket
 */
export async function createMaintenanceTicket(input: CreateMaintenanceTicketInput) {
  const ticket = await prisma.maintenanceTicket.create({
    data: {
      hotelId: input.hotelId,
      roomId: input.roomId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority || 'MEDIUM',
      status: 'OPEN',
      reportedBy: input.reportedBy,
      reportedAt: new Date(),
      assignedTo: input.assignedTo,
      blocksRoom: input.blocksRoom || false,
      estimatedCost: input.estimatedCost
    },
    include: {
      room: input.roomId ? {
        include: {
          roomType: true
        }
      } : undefined
    }
  })

  // If ticket blocks room, update room status and availability
  if (input.blocksRoom && input.roomId) {
    await blockRoomForMaintenance(input.hotelId, input.roomId)
  }

  eventBus.emit('maintenance.ticket.created', {
    ticketId: ticket.id,
    hotelId: ticket.hotelId,
    roomId: ticket.roomId,
    priority: ticket.priority,
    blocksRoom: ticket.blocksRoom
  })

  return ticket
}

/**
 * Update maintenance ticket
 */
export async function updateMaintenanceTicket(
  ticketId: string,
  hotelId: string,
  input: UpdateMaintenanceTicketInput
) {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId, hotelId }
  })

  if (!ticket) {
    throw new Error('Maintenance ticket not found')
  }

  // Handle room blocking changes
  if (input.blocksRoom !== undefined && input.blocksRoom !== ticket.blocksRoom) {
    if (input.blocksRoom && ticket.roomId) {
      await blockRoomForMaintenance(hotelId, ticket.roomId)
    } else if (!input.blocksRoom && ticket.roomId) {
      await unblockRoomFromMaintenance(hotelId, ticket.roomId)
    }
  }

  const updatedTicket = await prisma.maintenanceTicket.update({
    where: { id: ticketId, hotelId },
    data: input,
    include: {
      room: ticket.roomId ? {
        include: {
          roomType: true
        }
      } : undefined
    }
  })

  eventBus.emit('maintenance.ticket.updated', {
    ticketId: updatedTicket.id,
    hotelId,
    roomId: ticket.roomId,
    oldStatus: ticket.status,
    newStatus: updatedTicket.status
  })

  return updatedTicket
}

/**
 * Assign ticket to technician
 */
export async function assignMaintenanceTicket(
  ticketId: string,
  hotelId: string,
  assignedTo: string
) {
  const ticket = await prisma.maintenanceTicket.update({
    where: { id: ticketId, hotelId },
    data: {
      assignedTo,
      assignedAt: new Date(),
      status: 'ASSIGNED'
    }
  })

  eventBus.emit('maintenance.ticket.assigned', {
    ticketId: ticket.id,
    hotelId,
    roomId: ticket.roomId,
    assignedTo
  })

  return ticket
}

/**
 * Start work on ticket
 */
export async function startMaintenanceWork(ticketId: string, hotelId: string) {
  const ticket = await prisma.maintenanceTicket.update({
    where: { id: ticketId, hotelId },
    data: {
      status: 'IN_PROGRESS'
    }
  })

  eventBus.emit('maintenance.work.started', {
    ticketId: ticket.id,
    hotelId,
    roomId: ticket.roomId
  })

  return ticket
}

/**
 * Complete maintenance ticket
 */
export async function completeMaintenanceTicket(
  ticketId: string,
  hotelId: string,
  data: {
    resolution: string
    actualCost?: number
    resolvedBy: string
  }
) {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId, hotelId }
  })

  if (!ticket) {
    throw new Error('Maintenance ticket not found')
  }

  const updatedTicket = await prisma.maintenanceTicket.update({
    where: { id: ticketId, hotelId },
    data: {
      status: 'COMPLETED',
      resolution: data.resolution,
      actualCost: data.actualCost,
      resolvedBy: data.resolvedBy,
      resolvedAt: new Date()
    }
  })

  // Unblock room if it was blocked
  if (ticket.blocksRoom && ticket.roomId) {
    await unblockRoomFromMaintenance(hotelId, ticket.roomId)
  }

  eventBus.emit('maintenance.ticket.completed', {
    ticketId: updatedTicket.id,
    hotelId,
    roomId: ticket.roomId,
    actualCost: data.actualCost
  })

  return updatedTicket
}

/**
 * Close maintenance ticket
 */
export async function closeMaintenanceTicket(ticketId: string, hotelId: string) {
  const ticket = await prisma.maintenanceTicket.update({
    where: { id: ticketId, hotelId },
    data: {
      status: 'CLOSED'
    }
  })

  eventBus.emit('maintenance.ticket.closed', {
    ticketId: ticket.id,
    hotelId,
    roomId: ticket.roomId
  })

  return ticket
}

/**
 * Cancel maintenance ticket
 */
export async function cancelMaintenanceTicket(
  ticketId: string,
  hotelId: string,
  reason: string
) {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId, hotelId }
  })

  if (!ticket) {
    throw new Error('Maintenance ticket not found')
  }

  const updatedTicket = await prisma.maintenanceTicket.update({
    where: { id: ticketId, hotelId },
    data: {
      status: 'CANCELLED',
      resolution: `Cancelled: ${reason}`
    }
  })

  // Unblock room if it was blocked
  if (ticket.blocksRoom && ticket.roomId) {
    await unblockRoomFromMaintenance(hotelId, ticket.roomId)
  }

  eventBus.emit('maintenance.ticket.cancelled', {
    ticketId: updatedTicket.id,
    hotelId,
    roomId: ticket.roomId
  })

  return updatedTicket
}

/**
 * Block room for maintenance
 */
async function blockRoomForMaintenance(hotelId: string, roomId: string) {
  // Update room status to MAINTENANCE
  await prisma.room.update({
    where: { id: roomId, hotelId },
    data: {
      status: 'MAINTENANCE',
      isOutOfService: true
    }
  })

  // Update availability cache to reflect blocked room
  // This will be used by booking system to prevent new reservations
  const room = await prisma.room.findUnique({
    where: { id: roomId, hotelId },
    include: { roomType: true }
  })

  if (room) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Block for next 30 days by default
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      await prisma.roomAvailability.upsert({
        where: {
          roomTypeId_date: {
            roomTypeId: room.roomTypeId,
            date
          }
        },
        create: {
          roomTypeId: room.roomTypeId,
          date,
          totalRooms: 1,
          available: 0,
          occupied: 0,
          blocked: 1
        },
        update: {
          available: { decrement: 1 },
          blocked: { increment: 1 }
        }
      })
    }
  }
}

/**
 * Unblock room from maintenance
 */
async function unblockRoomFromMaintenance(hotelId: string, roomId: string) {
  // Update room status to AVAILABLE (or DIRTY if needs cleaning)
  const room = await prisma.room.findUnique({
    where: { id: roomId, hotelId }
  })

  if (!room) {
    throw new Error('Room not found')
  }

  // Check if room needs cleaning
  const needsCleaning = !room.lastCleaned || 
    (new Date().getTime() - room.lastCleaned.getTime()) > 24 * 60 * 60 * 1000

  await prisma.room.update({
    where: { id: roomId, hotelId },
    data: {
      status: needsCleaning ? 'DIRTY' : 'AVAILABLE',
      isOutOfService: false
    }
  })

  // Update availability cache
  const updatedRoom = await prisma.room.findUnique({
    where: { id: roomId, hotelId },
    include: { roomType: true }
  })

  if (updatedRoom) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Unblock for next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      await prisma.roomAvailability.upsert({
        where: {
          roomTypeId_date: {
            roomTypeId: updatedRoom.roomTypeId,
            date
          }
        },
        create: {
          roomTypeId: updatedRoom.roomTypeId,
          date,
          totalRooms: 1,
          available: needsCleaning ? 0 : 1,
          occupied: 0,
          blocked: 0
        },
        update: {
          available: { increment: needsCleaning ? 0 : 1 },
          blocked: { decrement: 1 }
        }
      })
    }
  }
}

/**
 * Get open tickets for room
 */
export async function getOpenTicketsForRoom(hotelId: string, roomId: string) {
  return prisma.maintenanceTicket.findMany({
    where: {
      hotelId,
      roomId,
      status: {
        in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD']
      }
    },
    orderBy: {
      priority: 'desc'
    }
  })
}

/**
 * Get tickets by status
 */
export async function getMaintenanceTicketsByStatus(
  hotelId: string,
  status: MaintenanceStatus
) {
  return prisma.maintenanceTicket.findMany({
    where: {
      hotelId,
      status
    },
    include: {
      room: {
        include: {
          roomType: true
        }
      }
    },
    orderBy: [
      { priority: 'desc' },
      { reportedAt: 'asc' }
    ]
  })
}

/**
 * Get maintenance statistics
 */
export async function getMaintenanceStats(hotelId: string, startDate: Date, endDate: Date) {
  const [total, open, inProgress, completed, cancelled] = await Promise.all([
    prisma.maintenanceTicket.count({
      where: {
        hotelId,
        reportedAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.maintenanceTicket.count({
      where: {
        hotelId,
        status: 'OPEN',
        reportedAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.maintenanceTicket.count({
      where: {
        hotelId,
        status: 'IN_PROGRESS',
        reportedAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.maintenanceTicket.count({
      where: {
        hotelId,
        status: 'COMPLETED',
        reportedAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.maintenanceTicket.count({
      where: {
        hotelId,
        status: 'CANCELLED',
        reportedAt: { gte: startDate, lte: endDate }
      }
    })
  ])

  // Get total cost
  const costData = await prisma.maintenanceTicket.aggregate({
    where: {
      hotelId,
      reportedAt: { gte: startDate, lte: endDate },
      status: 'COMPLETED'
    },
    _sum: {
      actualCost: true
    }
  })

  return {
    total,
    open,
    inProgress,
    completed,
    cancelled,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    totalCost: costData._sum.actualCost || 0
  }
}

/**
 * Check if room has blocking maintenance
 */
export async function roomHasBlockingMaintenance(hotelId: string, roomId: string): Promise<boolean> {
  if (!prisma.maintenanceTicket?.count) {
    return false
  }

  const count = await prisma.maintenanceTicket.count({
    where: {
      hotelId,
      roomId,
      blocksRoom: true,
      status: {
        in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD']
      }
    }
  })

  return count > 0
}
