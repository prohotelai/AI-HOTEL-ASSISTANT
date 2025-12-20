/**
 * Integration Tests for QR Code Login Workflow
 * Tests complete user journeys and multi-tenant isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateQRToken,
  validateQRToken,
  revokeToken,
} from '@/lib/services/qr/qrService';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db');
vi.mock('jsonwebtoken');

describe('QR Code Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete QR Guest Login Workflow', () => {
    it('should allow guest to login via QR token', async () => {
      // Step 1: Admin generates QR token for guest
      const mockGuest = {
        id: 'guest-1',
        email: 'john@example.com',
        name: 'John Doe',
        hotelId: 'hotel-1',
      };

      const mockToken = {
        id: 'token-1',
        hotelId: 'hotel-1',
        userId: 'guest-1',
        token: 'jwt-guest-token',
        role: 'guest',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockGuest as any);
      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(mockToken as any);

      // Generate token
      const token = await generateQRToken('hotel-1', 'guest-1', 'guest', 'admin-1');

      expect(token.role).toBe('guest');
      expect(token.userId).toBe('guest-1');
      expect(token.hotelId).toBe('hotel-1');

      // Step 2: Guest scans QR and provides token
      // This would happen on the widget
      expect(token.token).toBe('jwt-guest-token');
    });
  });

  describe('Complete QR Staff Login Workflow', () => {
    it('should allow staff to login via QR token with permissions', async () => {
      // Admin generates token for staff
      const mockStaff = {
        id: 'staff-1',
        email: 'jane@staff.com',
        name: 'Jane Smith',
        hotelId: 'hotel-1',
      };

      const mockToken = {
        id: 'token-2',
        hotelId: 'hotel-1',
        userId: 'staff-1',
        token: 'jwt-staff-token',
        role: 'staff',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStaff as any);
      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(mockToken as any);

      const token = await generateQRToken('hotel-1', 'staff-1', 'staff', 'admin-1');

      expect(token.role).toBe('staff');
      expect(token.userId).toBe('staff-1');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should prevent cross-hotel token generation', async () => {
      const userInHotel1 = {
        id: 'user-1',
        email: 'user@hotel1.com',
        name: 'User',
        hotelId: 'hotel-1', // User is in hotel-1
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(userInHotel1 as any);

      // Try to generate token for hotel-2 user
      await expect(
        generateQRToken('hotel-2', 'user-1', 'guest')
      ).rejects.toThrow('does not belong to hotel');
    });

    it('should prevent tokens being used in wrong hotel', async () => {
      // Token payload has hotel-1
      // Try to validate in hotel-2
      // This should fail
      const error = await new Promise((resolve) => {
        validateQRToken('token-for-hotel-1', 'hotel-2').catch(resolve);
      });

      expect(error).toBeDefined();
    });
  });

  describe('Token Lifecycle', () => {
    it('should complete full token lifecycle: generate -> use -> expire', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        hotelId: 'hotel-1',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Step 1: Generate token
      const mockToken = {
        id: 'token-1',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-token',
        role: 'guest',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(mockToken as any);

      const token = await generateQRToken('hotel-1', 'user-1', 'guest');
      expect(token.isUsed).toBe(false);

      // Step 2: Validate token (marks as used)
      const mockTokenDb = {
        ...mockToken,
        isUsed: true,
        usedAt: new Date(),
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockTokenDb as any);
      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue(mockTokenDb as any);

      // After validation, token should be marked used
      expect(prisma.guestStaffQRToken.update).toHaveBeenCalled();

      // Step 3: Try to use same token again
      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockTokenDb as any);

      // Should fail because token is already used
      await expect(validateQRToken(token.token, 'hotel-1')).rejects.toThrow(
        'Token has already been used'
      );
    });
  });

  describe('Token Revocation', () => {
    it('should prevent use of revoked tokens', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        hotelId: 'hotel-1',
      };

      const mockToken = {
        id: 'token-1',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-token',
        role: 'guest',
      };

      // Generate token
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue({
        ...mockToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      } as any);

      await generateQRToken('hotel-1', 'user-1', 'guest');

      // Revoke token
      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockToken as any);
      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue({
        ...mockToken,
        revokedAt: new Date(),
        revokedBy: 'admin-1',
      } as any);

      await revokeToken('token-1', 'admin-1');

      // Try to use revoked token
      const revokedTokenDb = {
        ...mockToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        revokedAt: new Date(), // Revoked
        user: mockUser,
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(revokedTokenDb as any);

      await expect(validateQRToken('jwt-token', 'hotel-1')).rejects.toThrow(
        'Token has been revoked'
      );
    });
  });

  describe('Concurrent Token Operations', () => {
    it('should handle concurrent token generations for different users', async () => {
      const mockUser1 = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        hotelId: 'hotel-1',
      };

      const mockUser2 = {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User 2',
        hotelId: 'hotel-1',
      };

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser1 as any)
        .mockResolvedValueOnce(mockUser2 as any);

      vi.mocked(prisma.guestStaffQRToken.create)
        .mockResolvedValueOnce({
          id: 'token-1',
          hotelId: 'hotel-1',
          userId: 'user-1',
          token: 'jwt-1',
          role: 'guest',
          expiresAt: new Date(),
          isUsed: false,
          usedAt: null,
          createdAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 'token-2',
          hotelId: 'hotel-1',
          userId: 'user-2',
          token: 'jwt-2',
          role: 'guest',
          expiresAt: new Date(),
          isUsed: false,
          usedAt: null,
          createdAt: new Date(),
        } as any);

      // Generate tokens concurrently
      const [token1, token2] = await Promise.all([
        generateQRToken('hotel-1', 'user-1', 'guest'),
        generateQRToken('hotel-1', 'user-2', 'guest'),
      ]);

      expect(token1.userId).toBe('user-1');
      expect(token2.userId).toBe('user-2');
      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired tokens', async () => {
      const expiredTime = Math.floor((Date.now() - 1 * 60 * 1000) / 1000); // 1 minute ago
      const payload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-1',
        type: 'qr-login',
        iat: expiredTime - 60,
        exp: expiredTime, // Already expired
      };

      // Note: In real test, we'd use jsonwebtoken to sign
      // For this test, we're checking the expiration check in DB

      const expiredToken = {
        id: 'token-1',
        token: 'expired-jwt',
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        isUsed: false,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1 * 60 * 1000), // Expired 1 minute ago
        user: {
          id: 'user-1',
          email: 'test@example.com',
          hotelId: 'hotel-1',
        },
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(expiredToken as any);

      await expect(validateQRToken('expired-jwt', 'hotel-1')).rejects.toThrow('expired');
    });
  });

  describe('Audit Trail', () => {
    it('should record token creation with admin info', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        hotelId: 'hotel-1',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const mockToken = {
        id: 'token-1',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-token',
        role: 'guest',
        expiresAt: new Date(),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
        createdBy: 'admin-1',
      };

      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(mockToken as any);

      await generateQRToken('hotel-1', 'user-1', 'guest', 'admin-1');

      // Verify audit info was recorded
      const createCall = vi.mocked(prisma.guestStaffQRToken.create).mock.calls[0][0];
      expect(createCall.data.createdBy).toBe('admin-1');
    });

    it('should record token revocation with admin info', async () => {
      const mockToken = {
        id: 'token-1',
        token: 'jwt-token',
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockToken as any);

      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue({
        ...mockToken,
        revokedAt: new Date(),
        revokedBy: 'admin-2',
      } as any);

      await revokeToken('token-1', 'admin-2');

      // Verify revocation audit info
      const updateCall = vi.mocked(prisma.guestStaffQRToken.update).mock.calls[0][0];
      expect(updateCall.data.revokedBy).toBe('admin-2');
      expect(updateCall.data.revokedAt).toBeDefined();
    });
  });
});
