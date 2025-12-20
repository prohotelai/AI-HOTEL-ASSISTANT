/**
 * Housekeeping Service - Phase 4
 * Manage room cleaning tasks and status transitions
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { HousekeepingTaskStatus, HousekeepingTaskPriority, RoomStatus } from '@prisma/client'

export interface CreateHousekeepingTaskInput {
  hotelId: string
  roomId: string
  taskType: string // CHECKOUT_CLEAN, STAYOVER_CLEAN, DEEP_CLEAN, INSPECTION
  priority?: HousekeepingTaskPriority
  scheduledFor?: Date
  assignedTo?: string
  notes?: string
}

export interface UpdateHousekeepingTaskInput {
  status?: HousekeepingTaskStatus
  priority?: HousekeepingTaskPriority
  assignedTo?: string
  notes?: string
  issuesFound?: string
  credits?: number
}

/**
 * Create housekeeping task
 */
export async function createHousekeepingTask(input: CreateHousekeepingTaskInput) {
  const task = await prisma.housekeepingTask.create({
    data: {
      hotelId: input.hotelId,
      roomId: input.roomId,
      taskType: input.taskType,
      status: 'PENDING',
      priority: input.priority || 'NORMAL',
      scheduledFor: input.scheduledFor,
      assignedTo: input.assignedTo,
      notes: input.notes
    },
    include: {
      room: {
        include: {
          roomType: true
        }
      }
    }
  })

  eventBus.emit('housekeeping.task.created', {
    taskId: task.id,
    hotelId: task.hotelId,
    roomId: task.roomId,
    taskType: task.taskType,
    priority: task.priority
  })

  return task
}

/**
 * Auto-generate housekeeping task on checkout
 */
export async function generateCheckoutCleaningTask(
  hotelId: string,
  roomId: string,
  bookingReference: string,
  checkoutTime?: Date
) {
  // Schedule for immediate cleaning after checkout
  const actualCheckoutTime = checkoutTime || new Date()
  const scheduledFor = new Date(actualCheckoutTime.getTime() + 15 * 60 * 1000) // 15 min after checkout

  const task = await createHousekeepingTask({
    hotelId,
    roomId,
    taskType: 'CHECKOUT_CLEAN',
    priority: 'HIGH',
    scheduledFor,
    notes: `Auto-generated on guest checkout (Booking: ${bookingReference})`
  })

  // Update room status to DIRTY
  await updateRoomStatus(hotelId, roomId, 'DIRTY')

  eventBus.emit('housekeeping.checkout.task.generated', {
    taskId: task.id,
    hotelId,
    roomId,
    bookingReference
  })

  return task
}

/**
 * Assign task to housekeeper
 */
export async function assignHousekeepingTask(
  taskId: string,
  hotelId: string,
  assignedTo: string
) {
  const task = await prisma.housekeepingTask.update({
    where: { id: taskId, hotelId },
    data: {
      assignedTo,
      assignedAt: new Date(),
      status: 'ASSIGNED'
    }
  })

  eventBus.emit('housekeeping.task.assigned', {
    taskId: task.id,
    hotelId,
    roomId: task.roomId,
    assignedTo
  })

  return task
}

/**
 * Start task
 */
export async function startHousekeepingTask(taskId: string, hotelId: string) {
  const task = await prisma.housekeepingTask.findUnique({
    where: { id: taskId, hotelId }
  })

  if (!task) {
    throw new Error('Housekeeping task not found')
  }

  const updatedTask = await prisma.housekeepingTask.update({
    where: { id: taskId, hotelId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date()
    }
  })

  // Update room status to CLEANING
  await updateRoomStatus(hotelId, task.roomId, 'CLEANING')

  eventBus.emit('housekeeping.task.started', {
    taskId: updatedTask.id,
    hotelId,
    roomId: task.roomId
  })

  return updatedTask
}

/**
 * Complete task
 */
export async function completeHousekeepingTask(
  taskId: string,
  hotelId: string,
  data: {
    issuesFound?: string
    credits?: number
  }
) {
  const task = await prisma.housekeepingTask.findUnique({
    where: { id: taskId, hotelId }
  })

  if (!task) {
    throw new Error('Housekeeping task not found')
  }

  const updatedTask = await prisma.housekeepingTask.update({
    where: { id: taskId, hotelId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      issuesFound: data.issuesFound,
      credits: data.credits || 1
    }
  })

  // If no issues found, mark room as AVAILABLE
  if (!data.issuesFound) {
    await updateRoomStatus(hotelId, task.roomId, 'AVAILABLE')
  } else {
    // If issues found, keep as INSPECTING for manager review
    await updateRoomStatus(hotelId, task.roomId, 'INSPECTING')
  }

  // Update room lastCleaned timestamp
  await prisma.room.update({
    where: { id: task.roomId, hotelId },
    data: {
      lastCleaned: new Date()
    }
  })

  eventBus.emit('housekeeping.task.completed', {
    taskId: updatedTask.id,
    hotelId,
    roomId: task.roomId,
    issuesFound: data.issuesFound || null
  })

  return updatedTask
}

/**
 * Verify task (inspection)
 */
export async function verifyHousekeepingTask(
  taskId: string,
  hotelId: string,
  approved: boolean,
  notes?: string
) {
  const task = await prisma.housekeepingTask.findUnique({
    where: { id: taskId, hotelId }
  })

  if (!task) {
    throw new Error('Housekeeping task not found')
  }

  const updatedTask = await prisma.housekeepingTask.update({
    where: { id: taskId, hotelId },
    data: {
      status: approved ? 'VERIFIED' : 'NEEDS_ATTENTION',
      notes: notes || task.notes
    }
  })

  // Update room status based on verification
  if (approved) {
    await updateRoomStatus(hotelId, task.roomId, 'AVAILABLE')
  }

  eventBus.emit('housekeeping.task.verified', {
    taskId: updatedTask.id,
    hotelId,
    roomId: task.roomId,
    passed: approved
  })

  return updatedTask
}

/**
 * Update room status helper
 */
async function updateRoomStatus(hotelId: string, roomId: string, status: RoomStatus) {
  return prisma.room.update({
    where: { id: roomId, hotelId },
    data: { status }
  })
}

/**
 * Get pending tasks for today
 */
export async function getPendingTasksToday(hotelId: string) {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  return prisma.housekeepingTask.findMany({
    where: {
      hotelId,
      status: {
        in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS']
      },
      scheduledFor: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      room: {
        include: {
          roomType: true
        }
      }
    },
    orderBy: {
      priority: 'desc'
    }
  })
}

/**
 * Get tasks by assignee
 */
export async function getTasksByAssignee(hotelId: string, assignedTo: string) {
  return prisma.housekeepingTask.findMany({
    where: {
      hotelId,
      assignedTo,
      status: {
        in: ['ASSIGNED', 'IN_PROGRESS']
      }
    },
    include: {
      room: {
        include: {
          roomType: true
        }
      }
    },
    orderBy: {
      scheduledFor: 'asc'
    }
  })
}

/**
 * Get housekeeping statistics
 */
export async function getHousekeepingStats(hotelId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const [total, completed, inProgress, pending] = await Promise.all([
    prisma.housekeepingTask.count({
      where: {
        hotelId,
        scheduledFor: { gte: startOfDay, lte: endOfDay }
      }
    }),
    prisma.housekeepingTask.count({
      where: {
        hotelId,
        status: 'COMPLETED',
        scheduledFor: { gte: startOfDay, lte: endOfDay }
      }
    }),
    prisma.housekeepingTask.count({
      where: {
        hotelId,
        status: 'IN_PROGRESS',
        scheduledFor: { gte: startOfDay, lte: endOfDay }
      }
    }),
    prisma.housekeepingTask.count({
      where: {
        hotelId,
        status: 'PENDING',
        scheduledFor: { gte: startOfDay, lte: endOfDay }
      }
    })
  ])

  return {
    total,
    completed,
    inProgress,
    pending,
    completionRate: total > 0 ? (completed / total) * 100 : 0
  }
}
