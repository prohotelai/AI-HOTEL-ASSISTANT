/**
 * Staff Service Tests
 * Tests for staff profile CRUD, departments, activities, HR notes, performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  createStaffProfile,
  getStaffProfile,
  listStaffProfiles,
  updateStaffProfile,
  deleteStaffProfile,
  createDepartment,
  listDepartments,
  deleteDepartment,
  logActivity,
  createHRNote,
  getHRNotes,
  logPerformanceMetric,
  getPerformanceMetrics,
  uploadStaffDocument,
  getStaffDocuments,
  createCalendarEvent,
  getCalendarEvents,
  createPerformanceReview,
  getStaffStatistics
} from '@/lib/services/staffService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    staffProfile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    department: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    staffActivity: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    hRNote: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    performanceMetric: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    staffDocument: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn()
    },
    calendarEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    performanceReview: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))

// Mock event bus
vi.mock('@/lib/events/eventBus', () => ({
  eventBus: {
    emit: vi.fn()
  }
}))

describe('Staff Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createStaffProfile', () => {
    it('should create staff profile with all fields', async () => {
      const mockProfile = {
        id: 'profile_001',
        userId: 'user_001',
        hotelId: 'hotel_001',
        firstName: 'John',
        lastName: 'Doe',
        employeeId: 'EMP001',
        position: 'Receptionist',
        employmentStatus: 'ACTIVE',
        startDate: new Date('2024-01-01'),
        user: { id: 'user_001', email: 'john@hotel.com' },
        department: { id: 'dept_001', name: 'Reception' }
      }

      vi.mocked(prisma.staffProfile.create).mockResolvedValue(mockProfile as any)
      vi.mocked(prisma.staffActivity.create).mockResolvedValue({} as any)

      const result = await createStaffProfile({
        userId: 'user_001',
        hotelId: 'hotel_001',
        firstName: 'John',
        lastName: 'Doe',
        employeeId: 'EMP001',
        position: 'Receptionist'
      })

      expect(result).toEqual(mockProfile)
      expect(prisma.staffProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_001',
          hotelId: 'hotel_001',
          firstName: 'John',
          lastName: 'Doe'
        }),
        include: expect.any(Object)
      })
      expect(prisma.staffActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'PROFILE_UPDATED',
          title: 'Staff profile created'
        })
      })
    })
  })

  describe('getStaffProfile', () => {
    it('should return profile with all related data', async () => {
      const mockProfile = {
        id: 'profile_001',
        firstName: 'John',
        lastName: 'Doe',
        user: { id: 'user_001', email: 'john@hotel.com' },
        department: { id: 'dept_001', name: 'Reception' },
        hrNotes: [{ id: 'note_001', title: 'Performance Review' }],
        performanceMetrics: [{ id: 'metric_001', name: 'Customer Satisfaction', value: 4.5 }],
        activities: [{ id: 'activity_001', type: 'PROFILE_UPDATED' }],
        documents: [{ id: 'doc_001', title: 'Contract' }],
        calendarEvents: [{ id: 'event_001', title: 'Shift' }]
      }

      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValue(mockProfile as any)

      const result = await getStaffProfile('profile_001')

      expect(result).toEqual(mockProfile)
      expect(prisma.staffProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'profile_001' },
        include: expect.objectContaining({
          user: expect.any(Object),
          department: true,
          hrNotes: expect.any(Object),
          performanceMetrics: expect.any(Object)
        })
      })
    })
  })

  describe('listStaffProfiles', () => {
    it('should list profiles with filters', async () => {
      const mockProfiles = [
        { id: 'profile_001', firstName: 'John', lastName: 'Doe' },
        { id: 'profile_002', firstName: 'Jane', lastName: 'Smith' }
      ]

      vi.mocked(prisma.staffProfile.findMany).mockResolvedValue(mockProfiles as any)
      vi.mocked(prisma.staffProfile.count).mockResolvedValue(2)

      const result = await listStaffProfiles({
        hotelId: 'hotel_001',
        departmentId: 'dept_001',
        employmentStatus: 'ACTIVE',
        limit: 50
      })

      expect(result.profiles).toEqual(mockProfiles)
      expect(result.total).toBe(2)
      expect(prisma.staffProfile.findMany).toHaveBeenCalledWith({
        where: {
          hotelId: 'hotel_001',
          departmentId: 'dept_001',
          employmentStatus: 'ACTIVE'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      })
    })

    it('should search by name and email', async () => {
      vi.mocked(prisma.staffProfile.findMany).mockResolvedValue([])
      vi.mocked(prisma.staffProfile.count).mockResolvedValue(0)

      await listStaffProfiles({
        hotelId: 'hotel_001',
        search: 'john'
      })

      expect(prisma.staffProfile.findMany).toHaveBeenCalledWith({
        where: {
          hotelId: 'hotel_001',
          OR: expect.arrayContaining([
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } }
          ])
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      })
    })
  })

  describe('updateStaffProfile', () => {
    it('should update profile and log activity', async () => {
      const mockUpdatedProfile = {
        id: 'profile_001',
        firstName: 'John',
        position: 'Senior Receptionist'
      }

      vi.mocked(prisma.staffProfile.update).mockResolvedValue(mockUpdatedProfile as any)
      vi.mocked(prisma.staffActivity.create).mockResolvedValue({} as any)

      const result = await updateStaffProfile(
        'profile_001',
        { position: 'Senior Receptionist', salary: 50000 },
        'manager_001'
      )

      expect(result).toEqual(mockUpdatedProfile)
      expect(prisma.staffProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile_001' },
        data: { position: 'Senior Receptionist', salary: 50000 },
        include: expect.any(Object)
      })
      expect(prisma.staffActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'PROFILE_UPDATED',
          title: 'Profile updated'
        })
      })
    })
  })

  describe('Departments', () => {
    it('should create department', async () => {
      const mockDepartment = {
        id: 'dept_001',
        hotelId: 'hotel_001',
        name: 'Housekeeping',
        color: '#10B981'
      }

      vi.mocked(prisma.department.create).mockResolvedValue(mockDepartment as any)

      const result = await createDepartment(
        'hotel_001',
        'Housekeeping',
        'Cleaning services',
        '#10B981'
      )

      expect(result).toEqual(mockDepartment)
    })

    it('should list departments with staff count', async () => {
      const mockDepartments = [
        { id: 'dept_001', name: 'Reception', _count: { staffProfiles: 5 } },
        { id: 'dept_002', name: 'Housekeeping', _count: { staffProfiles: 12 } }
      ]

      vi.mocked(prisma.department.findMany).mockResolvedValue(mockDepartments as any)

      const result = await listDepartments('hotel_001')

      expect(result).toEqual(mockDepartments)
      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: { hotelId: 'hotel_001' },
        include: { _count: { select: { staffProfiles: true } } },
        orderBy: { name: 'asc' }
      })
    })

    it('should not delete department with active staff', async () => {
      vi.mocked(prisma.staffProfile.count).mockResolvedValue(5)

      await expect(deleteDepartment('dept_001')).rejects.toThrow(
        'Cannot delete department with active staff members'
      )
    })
  })

  describe('HR Notes', () => {
    it('should create HR note and log activity', async () => {
      const mockNote = {
        id: 'note_001',
        title: 'Performance Review',
        content: 'Great work this quarter',
        isConfidential: true
      }

      vi.mocked(prisma.hRNote.create).mockResolvedValue(mockNote as any)
      vi.mocked(prisma.staffActivity.create).mockResolvedValue({} as any)

      const result = await createHRNote(
        'profile_001',
        'Performance Review',
        'Great work this quarter',
        'manager_001',
        true,
        ['performance'],
        []
      )

      expect(result).toEqual(mockNote)
      expect(prisma.staffActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'NOTE_ADDED',
          title: 'HR note added'
        })
      })
    })
  })

  describe('Performance Metrics', () => {
    it('should log performance metric', async () => {
      const mockMetric = {
        id: 'metric_001',
        name: 'Customer Satisfaction',
        value: 4.8,
        target: 5.0,
        unit: 'score'
      }

      vi.mocked(prisma.performanceMetric.create).mockResolvedValue(mockMetric as any)
      vi.mocked(prisma.staffActivity.create).mockResolvedValue({} as any)

      const result = await logPerformanceMetric(
        'profile_001',
        'Customer Satisfaction',
        4.8,
        new Date('2024-10-01'),
        new Date('2024-12-31'),
        'manager_001',
        5.0,
        'score'
      )

      expect(result).toEqual(mockMetric)
      expect(prisma.performanceMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Customer Satisfaction',
          value: 4.8,
          target: 5.0
        })
      })
    })

    it('should get metrics for date range', async () => {
      vi.mocked(prisma.performanceMetric.findMany).mockResolvedValue([])

      await getPerformanceMetrics(
        'profile_001',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      )

      expect(prisma.performanceMetric.findMany).toHaveBeenCalledWith({
        where: {
          staffProfileId: 'profile_001',
          periodStart: { gte: expect.any(Date) },
          periodEnd: { lte: expect.any(Date) }
        },
        orderBy: { periodStart: 'desc' }
      })
    })
  })

  describe('Documents', () => {
    it('should upload document and log activity', async () => {
      const mockDocument = {
        id: 'doc_001',
        title: 'Employment Contract',
        fileUrl: 'https://cdn.com/contract.pdf',
        fileName: 'contract.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        category: 'contract'
      }

      vi.mocked(prisma.staffDocument.create).mockResolvedValue(mockDocument as any)
      vi.mocked(prisma.staffActivity.create).mockResolvedValue({} as any)

      const result = await uploadStaffDocument(
        'profile_001',
        'Employment Contract',
        'https://cdn.com/contract.pdf',
        'contract.pdf',
        102400,
        'application/pdf',
        'manager_001',
        'contract'
      )

      expect(result).toEqual(mockDocument)
      expect(prisma.staffActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DOCUMENT_UPLOADED'
        })
      })
    })
  })

  describe('Calendar Events', () => {
    it('should create calendar event', async () => {
      const mockEvent = {
        id: 'event_001',
        title: 'Morning Shift',
        startTime: new Date('2024-12-12T08:00:00Z'),
        endTime: new Date('2024-12-12T16:00:00Z'),
        eventType: 'shift'
      }

      vi.mocked(prisma.calendarEvent.create).mockResolvedValue(mockEvent as any)

      const result = await createCalendarEvent(
        'profile_001',
        'Morning Shift',
        new Date('2024-12-12T08:00:00Z'),
        new Date('2024-12-12T16:00:00Z'),
        'manager_001',
        'shift'
      )

      expect(result).toEqual(mockEvent)
    })

    it('should get events for date range', async () => {
      vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([])

      await getCalendarEvents(
        'profile_001',
        new Date('2024-12-01'),
        new Date('2024-12-31')
      )

      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({
        where: {
          staffProfileId: 'profile_001',
          startTime: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        orderBy: { startTime: 'asc' }
      })
    })
  })

  describe('Statistics', () => {
    it('should get staff statistics', async () => {
      vi.mocked(prisma.staffProfile.count).mockResolvedValueOnce(45).mockResolvedValueOnce(42)
      vi.mocked(prisma.department.count).mockResolvedValue(6)
      vi.mocked(prisma.staffActivity.findMany).mockResolvedValue([])
      vi.mocked(prisma.performanceReview.findMany).mockResolvedValue([])

      const result = await getStaffStatistics('hotel_001')

      expect(result.totalStaff).toBe(45)
      expect(result.activeStaff).toBe(42)
      expect(result.departments).toBe(6)
    })
  })
})
