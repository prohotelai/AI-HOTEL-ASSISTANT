/**
 * Staff Invitation Flow Tests
 * Tests for invitation system, magic links, and acceptance flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  sendStaffInvitation,
  resendStaffInvitation,
  validateInvitationToken,
  acceptStaffInvitation,
  cancelStaffInvitation,
  listStaffInvitations,
  generateInvitationToken,
  cleanupExpiredInvitations
} from '@/lib/services/invitationService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    staffInvitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    staffProfile: {
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

// Mock event bus
vi.mock('@/lib/events/eventBus', () => ({
  eventBus: {
    emit: vi.fn()
  }
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123')
  }
}))

describe('Invitation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  describe('generateInvitationToken', () => {
    it('should generate 64-character hex token', () => {
      const token = generateInvitationToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should generate unique tokens', () => {
      const token1 = generateInvitationToken()
      const token2 = generateInvitationToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('sendStaffInvitation', () => {
    it('should send invitation with magic link', async () => {
      const mockHotel = { id: 'hotel_001', name: 'Grand Hotel' }
      const mockInvitation = {
        id: 'inv_001',
        email: 'newstaff@hotel.com',
        token: 'abc123token',
        firstName: 'John',
        lastName: 'Doe',
        hotelId: 'hotel_001',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'PENDING',
        hotel: mockHotel
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.staffInvitation.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.staffInvitation.create).mockResolvedValue(mockInvitation as any)

      const result = await sendStaffInvitation({
        hotelId: 'hotel_001',
        email: 'newstaff@hotel.com',
        firstName: 'John',
        lastName: 'Doe',
        departmentId: 'dept_001',
        position: 'Receptionist',
        invitedBy: 'manager_001'
      })

      expect(result.invitation).toEqual(mockInvitation)
      expect(result.magicLink).toContain('accept-invitation?token=')
      expect(result.token).toBe('abc123token')
      expect(prisma.staffInvitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newstaff@hotel.com',
          firstName: 'John',
          lastName: 'Doe',
          hotelId: 'hotel_001'
        }),
        include: { hotel: true }
      })
    })

    it('should throw error if user already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_001',
        email: 'existing@hotel.com'
      } as any)

      await expect(
        sendStaffInvitation({
          hotelId: 'hotel_001',
          email: 'existing@hotel.com',
          firstName: 'John',
          lastName: 'Doe',
          invitedBy: 'manager_001'
        })
      ).rejects.toThrow('User with this email already exists')
    })

    it('should throw error if pending invitation exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.staffInvitation.findFirst).mockResolvedValue({
        id: 'inv_001',
        status: 'PENDING'
      } as any)

      await expect(
        sendStaffInvitation({
          hotelId: 'hotel_001',
          email: 'pending@hotel.com',
          firstName: 'John',
          lastName: 'Doe',
          invitedBy: 'manager_001'
        })
      ).rejects.toThrow('Pending invitation already exists for this email')
    })

    it('should set expiration to 24 hours', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.staffInvitation.findFirst).mockResolvedValue(null)

      let capturedData: any
      vi.mocked(prisma.staffInvitation.create).mockImplementation((args: any) => {
        capturedData = args.data
        return Promise.resolve({
          ...capturedData,
          hotel: { name: 'Test Hotel' }
        } as any)
      })

      await sendStaffInvitation({
        hotelId: 'hotel_001',
        email: 'test@hotel.com',
        firstName: 'Test',
        lastName: 'User',
        invitedBy: 'manager_001'
      })

      const hoursDiff =
        (capturedData.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
      expect(hoursDiff).toBeGreaterThan(23.9)
      expect(hoursDiff).toBeLessThan(24.1)
    })
  })

  describe('resendStaffInvitation', () => {
    it('should generate new token and reset expiry', async () => {
      const existingInvitation = {
        id: 'inv_001',
        email: 'test@hotel.com',
        status: 'EXPIRED',
        hotel: { name: 'Test Hotel' }
      }

      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue(existingInvitation as any)
      vi.mocked(prisma.staffInvitation.update).mockResolvedValue({
        ...existingInvitation,
        status: 'PENDING',
        token: 'new_token_123'
      } as any)

      const result = await resendStaffInvitation('inv_001')

      expect(result.invitation.status).toBe('PENDING')
      expect(result.token).toBe('new_token_123')
      expect(prisma.staffInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_001' },
        data: expect.objectContaining({
          status: 'PENDING',
          sentAt: expect.any(Date),
          expiresAt: expect.any(Date)
        }),
        include: { hotel: true }
      })
    })

    it('should throw error if invitation already accepted', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue({
        id: 'inv_001',
        status: 'ACCEPTED'
      } as any)

      await expect(resendStaffInvitation('inv_001')).rejects.toThrow(
        'Invitation already accepted'
      )
    })
  })

  describe('validateInvitationToken', () => {
    it('should validate valid token', async () => {
      const validInvitation = {
        id: 'inv_001',
        token: 'valid_token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        hotel: { name: 'Test Hotel' }
      }

      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue(validInvitation as any)

      const result = await validateInvitationToken('valid_token')

      expect(result.valid).toBe(true)
      expect(result.invitation).toEqual(validInvitation)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid token', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue(null)

      const result = await validateInvitationToken('invalid_token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid invitation token')
    })

    it('should reject already accepted invitation', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue({
        id: 'inv_001',
        status: 'ACCEPTED'
      } as any)

      const result = await validateInvitationToken('accepted_token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invitation already accepted')
    })

    it('should reject cancelled invitation', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue({
        id: 'inv_001',
        status: 'CANCELLED'
      } as any)

      const result = await validateInvitationToken('cancelled_token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invitation has been cancelled')
    })

    it('should reject and update expired invitation', async () => {
      const expiredInvitation = {
        id: 'inv_001',
        token: 'expired_token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }

      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue(expiredInvitation as any)
      vi.mocked(prisma.staffInvitation.update).mockResolvedValue({
        ...expiredInvitation,
        status: 'EXPIRED'
      } as any)

      const result = await validateInvitationToken('expired_token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invitation has expired')
      expect(prisma.staffInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_001' },
        data: { status: 'EXPIRED' }
      })
    })
  })

  describe('acceptStaffInvitation', () => {
    it('should create user and staff profile', async () => {
      const mockInvitation = {
        id: 'inv_001',
        email: 'newstaff@hotel.com',
        firstName: 'John',
        lastName: 'Doe',
        token: 'valid_token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        hotelId: 'hotel_001',
        departmentId: 'dept_001',
        position: 'Receptionist',
        role: 'staff',
        hotel: { name: 'Test Hotel' }
      }

      const mockUser = {
        id: 'user_001',
        email: 'newstaff@hotel.com',
        name: 'John Doe'
      }

      const mockProfile = {
        id: 'profile_001',
        userId: 'user_001',
        firstName: 'John',
        lastName: 'Doe'
      }

      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue(mockInvitation as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          user: {
            create: vi.fn().mockResolvedValue(mockUser)
          },
          staffProfile: {
            create: vi.fn().mockResolvedValue(mockProfile)
          },
          staffInvitation: {
            update: vi.fn().mockResolvedValue({
              ...mockInvitation,
              status: 'ACCEPTED',
              acceptedAt: new Date()
            })
          }
        })
      })

      const result = await acceptStaffInvitation({
        token: 'valid_token',
        password: 'SecurePassword123!',
        phoneNumber: '+1234567890'
      })

      expect(result.user.email).toBe('newstaff@hotel.com')
      expect(result.staffProfile.firstName).toBe('John')
      expect(result.invitation.status).toBe('ACCEPTED')
    })

    it('should hash password with bcrypt', async () => {
      const bcrypt = await import('bcryptjs')
      
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue({
        id: 'inv_001',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        hotel: { name: 'Test' }
      } as any)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          user: { create: vi.fn().mockResolvedValue({ id: 'user_001' }) },
          staffProfile: { create: vi.fn().mockResolvedValue({ id: 'profile_001' }) },
          staffInvitation: { update: vi.fn().mockResolvedValue({ status: 'ACCEPTED' }) }
        })
      })

      await acceptStaffInvitation({
        token: 'valid_token',
        password: 'MyPassword123!'
      })

      expect(bcrypt.default.hash).toHaveBeenCalledWith('MyPassword123!', 10)
    })

    it('should throw error for invalid token', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue(null)

      await expect(
        acceptStaffInvitation({
          token: 'invalid_token',
          password: 'password'
        })
      ).rejects.toThrow('Invalid invitation token')
    })
  })

  describe('cancelStaffInvitation', () => {
    it('should cancel pending invitation', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue({
        id: 'inv_001',
        status: 'PENDING'
      } as any)

      vi.mocked(prisma.staffInvitation.update).mockResolvedValue({
        id: 'inv_001',
        status: 'CANCELLED'
      } as any)

      const result = await cancelStaffInvitation('inv_001')

      expect(result.status).toBe('CANCELLED')
    })

    it('should not cancel accepted invitation', async () => {
      vi.mocked(prisma.staffInvitation.findUnique).mockResolvedValue({
        id: 'inv_001',
        status: 'ACCEPTED'
      } as any)

      await expect(cancelStaffInvitation('inv_001')).rejects.toThrow(
        'Cannot cancel accepted invitation'
      )
    })
  })

  describe('listStaffInvitations', () => {
    it('should list all invitations', async () => {
      const mockInvitations = [
        { id: 'inv_001', status: 'PENDING', email: 'user1@hotel.com' },
        { id: 'inv_002', status: 'ACCEPTED', email: 'user2@hotel.com' }
      ]

      vi.mocked(prisma.staffInvitation.findMany).mockResolvedValue(mockInvitations as any)

      const result = await listStaffInvitations('hotel_001')

      expect(result).toEqual(mockInvitations)
      expect(prisma.staffInvitation.findMany).toHaveBeenCalledWith({
        where: { hotelId: 'hotel_001' },
        orderBy: { sentAt: 'desc' }
      })
    })

    it('should filter by status', async () => {
      vi.mocked(prisma.staffInvitation.findMany).mockResolvedValue([])

      await listStaffInvitations('hotel_001', 'PENDING')

      expect(prisma.staffInvitation.findMany).toHaveBeenCalledWith({
        where: { hotelId: 'hotel_001', status: 'PENDING' },
        orderBy: { sentAt: 'desc' }
      })
    })
  })

  describe('cleanupExpiredInvitations', () => {
    it('should mark expired invitations', async () => {
      vi.mocked(prisma.staffInvitation.updateMany).mockResolvedValue({ count: 3 } as any)

      const result = await cleanupExpiredInvitations()

      expect(result).toBe(3)
      expect(prisma.staffInvitation.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: { lt: expect.any(Date) }
        },
        data: { status: 'EXPIRED' }
      })
    })
  })
})
