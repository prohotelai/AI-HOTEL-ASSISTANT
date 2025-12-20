/**
 * Maintenance Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMaintenanceTicket,
  updateMaintenanceTicket,
  assignMaintenanceTicket,
  startMaintenanceWork,
  completeMaintenanceTicket,
  closeMaintenanceTicket,
  cancelMaintenanceTicket,
  getOpenTicketsForRoom,
  getMaintenanceStats,
  roomHasBlockingMaintenance
} from '@/lib/services/maintenanceService'
import { MaintenanceStatus, MaintenancePriority } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    maintenanceTicket: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn()
    },
    room: {
      update: vi.fn(),
      findUnique: vi.fn()
    },
    roomAvailability: {
      upsert: vi.fn()
    }
  }
}))

// Mock eventBus
vi.mock('@/lib/events/eventBus', () => ({
  eventBus: {
    emit: vi.fn()
  }
}))

describe('Maintenance Service', () => {
  const mockHotelId = 'hotel-123'
  const mockRoomId = 'room-456'
  const mockUserId = 'user-789'
  const mockTicketId = 'ticket-001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMaintenanceTicket', () => {
    it('should create a maintenance ticket', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        title: 'Broken AC',
        description: 'AC not cooling',
        category: 'HVAC',
        priority: 'HIGH' as MaintenancePriority,
        status: 'OPEN' as MaintenanceStatus,
        reportedBy: mockUserId,
        reportedAt: new Date(),
        blocksRoom: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.create).mockResolvedValue(mockTicket as any)

      const result = await createMaintenanceTicket({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        title: 'Broken AC',
        description: 'AC not cooling',
        category: 'HVAC',
        priority: 'HIGH',
        reportedBy: mockUserId,
        blocksRoom: false
      })

      expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          hotelId: mockHotelId,
          roomId: mockRoomId,
          title: 'Broken AC',
          description: 'AC not cooling',
          category: 'HVAC',
          priority: 'HIGH',
          status: 'OPEN',
          blocksRoom: false
        }),
        include: expect.any(Object)
      })
      expect(result).toEqual(mockTicket)
    })

    it('should block room when blocksRoom is true', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        title: 'Major leak',
        description: 'Water leak from ceiling',
        category: 'PLUMBING',
        priority: 'CRITICAL' as MaintenancePriority,
        status: 'OPEN' as MaintenanceStatus,
        reportedBy: mockUserId,
        reportedAt: new Date(),
        blocksRoom: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockRoom = {
        id: mockRoomId,
        hotelId: mockHotelId,
        roomTypeId: 'roomtype-123',
        roomType: {
          id: 'roomtype-123',
          name: 'Deluxe'
        }
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.create).mockResolvedValue(mockTicket as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any)
      vi.mocked(prisma.roomAvailability.upsert).mockResolvedValue({} as any)

      const result = await createMaintenanceTicket({
        hotelId: mockHotelId,
        roomId: mockRoomId,
        title: 'Major leak',
        description: 'Water leak from ceiling',
        category: 'PLUMBING',
        priority: 'CRITICAL',
        reportedBy: mockUserId,
        blocksRoom: true
      })

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: mockRoomId, hotelId: mockHotelId },
        data: {
          status: 'MAINTENANCE',
          isOutOfService: true
        }
      })
      expect(result.blocksRoom).toBe(true)
    })
  })

  describe('assignMaintenanceTicket', () => {
    it('should assign ticket to technician', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        status: 'ASSIGNED' as MaintenanceStatus,
        assignedTo: mockUserId,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.update).mockResolvedValue(mockTicket as any)

      const result = await assignMaintenanceTicket(mockTicketId, mockHotelId, mockUserId)

      expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId, hotelId: mockHotelId },
        data: expect.objectContaining({
          assignedTo: mockUserId,
          status: 'ASSIGNED'
        })
      })
      expect(result.status).toBe('ASSIGNED')
    })
  })

  describe('startMaintenanceWork', () => {
    it('should update ticket status to IN_PROGRESS', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        status: 'IN_PROGRESS' as MaintenanceStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.update).mockResolvedValue(mockTicket as any)

      const result = await startMaintenanceWork(mockTicketId, mockHotelId)

      expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId, hotelId: mockHotelId },
        data: { status: 'IN_PROGRESS' }
      })
      expect(result.status).toBe('IN_PROGRESS')
    })
  })

  describe('completeMaintenanceTicket', () => {
    it('should complete ticket and unblock room', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        status: 'COMPLETED' as MaintenanceStatus,
        blocksRoom: true,
        resolution: 'Fixed AC unit',
        actualCost: 250,
        resolvedBy: mockUserId,
        resolvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockRoom = {
        id: mockRoomId,
        hotelId: mockHotelId,
        roomTypeId: 'roomtype-123',
        lastCleaned: new Date(),
        roomType: {
          id: 'roomtype-123',
          name: 'Deluxe'
        }
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.findUnique).mockResolvedValue(mockTicket as any)
      vi.mocked(prisma.maintenanceTicket.update).mockResolvedValue(mockTicket as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any)
      vi.mocked(prisma.roomAvailability.upsert).mockResolvedValue({} as any)

      const result = await completeMaintenanceTicket(mockTicketId, mockHotelId, {
        resolution: 'Fixed AC unit',
        actualCost: 250,
        resolvedBy: mockUserId
      })

      expect(result.status).toBe('COMPLETED')
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: mockRoomId, hotelId: mockHotelId },
        data: {
          status: 'AVAILABLE',
          isOutOfService: false
        }
      })
    })
  })

  describe('closeMaintenanceTicket', () => {
    it('should close ticket', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        status: 'CLOSED' as MaintenanceStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.update).mockResolvedValue(mockTicket as any)

      const result = await closeMaintenanceTicket(mockTicketId, mockHotelId)

      expect(result.status).toBe('CLOSED')
    })
  })

  describe('cancelMaintenanceTicket', () => {
    it('should cancel ticket and unblock room', async () => {
      const mockTicket = {
        id: mockTicketId,
        hotelId: mockHotelId,
        roomId: mockRoomId,
        status: 'CANCELLED' as MaintenanceStatus,
        blocksRoom: true,
        resolution: 'Cancelled: Duplicate report',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockRoom = {
        id: mockRoomId,
        hotelId: mockHotelId,
        roomTypeId: 'roomtype-123',
        lastCleaned: new Date(),
        roomType: {
          id: 'roomtype-123',
          name: 'Deluxe'
        }
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.findUnique).mockResolvedValue(mockTicket as any)
      vi.mocked(prisma.maintenanceTicket.update).mockResolvedValue(mockTicket as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any)
      vi.mocked(prisma.roomAvailability.upsert).mockResolvedValue({} as any)

      const result = await cancelMaintenanceTicket(mockTicketId, mockHotelId, 'Duplicate report')

      expect(result.status).toBe('CANCELLED')
      expect(prisma.room.update).toHaveBeenCalled()
    })
  })

  describe('getOpenTicketsForRoom', () => {
    it('should return open tickets for room', async () => {
      const mockTickets = [
        { id: 'ticket-1', status: 'OPEN', priority: 'HIGH' },
        { id: 'ticket-2', status: 'IN_PROGRESS', priority: 'MEDIUM' }
      ]

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.findMany).mockResolvedValue(mockTickets as any)

      const result = await getOpenTicketsForRoom(mockHotelId, mockRoomId)

      expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith({
        where: {
          hotelId: mockHotelId,
          roomId: mockRoomId,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] }
        },
        orderBy: { priority: 'desc' }
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('getMaintenanceStats', () => {
    it('should calculate maintenance statistics', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // open
        .mockResolvedValueOnce(30)  // inProgress
        .mockResolvedValueOnce(45)  // completed
        .mockResolvedValueOnce(5)   // cancelled

      vi.mocked(prisma.maintenanceTicket.aggregate).mockResolvedValue({
        _sum: { actualCost: 15000 }
      } as any)

      const result = await getMaintenanceStats(mockHotelId, new Date(), new Date())

      expect(result).toEqual({
        total: 100,
        open: 20,
        inProgress: 30,
        completed: 45,
        cancelled: 5,
        completionRate: 45,
        totalCost: 15000
      })
    })
  })

  describe('roomHasBlockingMaintenance', () => {
    it('should return true when room has blocking maintenance', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.count).mockResolvedValue(1)

      const result = await roomHasBlockingMaintenance(mockHotelId, mockRoomId)

      expect(result).toBe(true)
      expect(prisma.maintenanceTicket.count).toHaveBeenCalledWith({
        where: {
          hotelId: mockHotelId,
          roomId: mockRoomId,
          blocksRoom: true,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] }
        }
      })
    })

    it('should return false when room has no blocking maintenance', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.maintenanceTicket.count).mockResolvedValue(0)

      const result = await roomHasBlockingMaintenance(mockHotelId, mockRoomId)

      expect(result).toBe(false)
    })
  })
})
