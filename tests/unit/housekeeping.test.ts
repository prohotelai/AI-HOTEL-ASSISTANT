/**
 * Housekeeping Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createHousekeepingTask,
  generateCheckoutCleaningTask,
  assignHousekeepingTask,
  startHousekeepingTask,
  completeHousekeepingTask,
  verifyHousekeepingTask,
  getPendingTasksToday,
  getHousekeepingStats
} from '@/lib/services/housekeepingService'
import { HousekeepingTaskStatus, HousekeepingTaskPriority } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    housekeepingTask: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    room: {
      update: vi.fn(),
      findUnique: vi.fn()
    }
  }
}))

// Mock eventBus
vi.mock('@/lib/events/eventBus', () => ({
  eventBus: {
    emit: vi.fn()
  }
}))

describe('Housekeeping Service', () => {
  const mockHotelId = 'hotel-123'
  const mockRoomId = 'room-456'
  const mockUserId = 'user-789'
  const mockTaskId = 'task-001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createHousekeepingTask', () => {
    it('should create a task with correct data', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'PENDING' as HousekeepingTaskStatus,
        priority: 'HIGH' as HousekeepingTaskPriority,
        scheduledFor: new Date(),
        notes: 'Test task',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.create).mockResolvedValue(mockTask as any)

      const result = await createHousekeepingTask(
        mockHotelId,
        mockRoomId,
        'CHECKOUT_CLEAN',
        { priority: 'HIGH', notes: 'Test task' }
      )

      expect(prisma.housekeepingTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          hotelId: mockHotelId,
          roomId: mockRoomId,
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
          priority: 'HIGH',
          notes: 'Test task'
        })
      })
      expect(result).toEqual(mockTask)
    })
  })

  describe('assignHousekeepingTask', () => {
    it('should assign task to staff member', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'ASSIGNED' as HousekeepingTaskStatus,
        assignedTo: mockUserId,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.update).mockResolvedValue(mockTask as any)

      const result = await assignHousekeepingTask(mockTaskId, mockHotelId, mockUserId)

      expect(prisma.housekeepingTask.update).toHaveBeenCalledWith({
        where: { id: mockTaskId, hotelId: mockHotelId },
        data: expect.objectContaining({
          assignedTo: mockUserId,
          status: 'ASSIGNED'
        })
      })
      expect(result.status).toBe('ASSIGNED')
    })
  })

  describe('startHousekeepingTask', () => {
    it('should start task and update room status to CLEANING', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'IN_PROGRESS' as HousekeepingTaskStatus,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.update).mockResolvedValue(mockTask as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)

      const result = await startHousekeepingTask(mockTaskId, mockHotelId)

      expect(prisma.housekeepingTask.update).toHaveBeenCalled()
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: mockRoomId, hotelId: mockHotelId },
        data: { status: 'CLEANING' }
      })
      expect(result.status).toBe('IN_PROGRESS')
    })
  })

  describe('completeHousekeepingTask', () => {
    it('should complete task with no issues and set room to AVAILABLE', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'COMPLETED' as HousekeepingTaskStatus,
        completedAt: new Date(),
        issuesFound: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.update).mockResolvedValue(mockTask as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)

      const result = await completeHousekeepingTask(mockTaskId, mockHotelId, {
        issuesFound: null,
        credits: 5
      })

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: mockRoomId, hotelId: mockHotelId },
        data: expect.objectContaining({ status: 'AVAILABLE' })
      })
      expect(result.status).toBe('COMPLETED')
    })

    it('should complete task with issues and set room to INSPECTING', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'COMPLETED' as HousekeepingTaskStatus,
        completedAt: new Date(),
        issuesFound: 'Broken lamp',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.update).mockResolvedValue(mockTask as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)

      const result = await completeHousekeepingTask(mockTaskId, mockHotelId, {
        issuesFound: 'Broken lamp',
        credits: 5
      })

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: mockRoomId, hotelId: mockHotelId },
        data: expect.objectContaining({ status: 'INSPECTING' })
      })
      expect(result.issuesFound).toBe('Broken lamp')
    })
  })

  describe('verifyHousekeepingTask', () => {
    it('should verify task successfully', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'VERIFIED' as HousekeepingTaskStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.update).mockResolvedValue(mockTask as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)

      const result = await verifyHousekeepingTask(mockTaskId, mockHotelId, true)

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: mockRoomId, hotelId: mockHotelId },
        data: expect.objectContaining({ status: 'AVAILABLE' })
      })
      expect(result.status).toBe('VERIFIED')
    })

    it('should mark task as needs attention', async () => {
      const mockTask = {
        id: mockTaskId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'NEEDS_ATTENTION' as HousekeepingTaskStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.update).mockResolvedValue(mockTask as any)

      const result = await verifyHousekeepingTask(mockTaskId, mockHotelId, false)

      expect(result.status).toBe('NEEDS_ATTENTION')
    })
  })

  describe('getPendingTasksToday', () => {
    it('should return pending tasks for today', async () => {
      const mockTasks = [
        { id: 'task-1', status: 'PENDING', scheduledFor: new Date() },
        { id: 'task-2', status: 'ASSIGNED', scheduledFor: new Date() }
      ]

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.findMany).mockResolvedValue(mockTasks as any)

      const result = await getPendingTasksToday(mockHotelId)

      expect(prisma.housekeepingTask.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          hotelId: mockHotelId,
          status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }
        }),
        include: expect.any(Object)
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('getHousekeepingStats', () => {
    it('should calculate statistics correctly', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.housekeepingTask.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(70)  // completed
        .mockResolvedValueOnce(20)  // inProgress
        .mockResolvedValueOnce(10)  // pending

      const result = await getHousekeepingStats(mockHotelId, new Date(), new Date())

      expect(result).toEqual({
        total: 100,
        completed: 70,
        inProgress: 20,
        pending: 10,
        completionRate: 70
      })
    })
  })
})
