/**
 * Unit Tests for QR Service Layer
 * Tests: Token generation, validation, revocation, and management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateQRToken,
  validateQRToken,
  revokeToken,
  listActiveTokens,
  getUserTokens,
  regenerateToken,
  getTokenStats,
  QRTokenPayload,
  QRTokenResponse,
} from '@/lib/services/qr/qrService';
import { prisma } from '@/lib/db';
import { sign, verify } from 'jsonwebtoken';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    guestStaffQRToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';

describe('QRService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQRToken', () => {
    it('should generate a QR token successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'guest@example.com',
        name: 'John Guest',
        hotelId: 'hotel-1',
      };

      const mockToken = {
        id: 'token-1',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-token-xyz',
        role: 'guest',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(mockToken as any);

      const result = await generateQRToken('hotel-1', 'user-1', 'guest');

      expect(result.hotelId).toBe('hotel-1');
      expect(result.userId).toBe('user-1');
      expect(result.role).toBe('guest');
      expect(result.token).toBe('jwt-token-xyz');
      expect(result.isUsed).toBe(false);
    });

    it('should throw error if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        generateQRToken('hotel-1', 'unknown-user', 'guest')
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user does not belong to hotel', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'guest@example.com',
        name: 'John Guest',
        hotelId: 'hotel-2', // Different hotel
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(
        generateQRToken('hotel-1', 'user-1', 'guest')
      ).rejects.toThrow('does not belong to hotel');
    });

    it('should throw error if invalid role provided', async () => {
      await expect(
        generateQRToken('hotel-1', 'user-1', 'admin' as any)
      ).rejects.toThrow('Invalid role');
    });

    it('should throw error if missing required parameters', async () => {
      await expect(
        generateQRToken('', 'user-1', 'guest')
      ).rejects.toThrow('Missing required parameters');
    });

    it('should store token in database with metadata', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'staff@example.com',
        name: 'John Staff',
        hotelId: 'hotel-1',
      };

      const mockToken = {
        id: 'token-2',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-token-abc',
        role: 'staff',
        expiresAt: new Date(),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
        metadata: '{"ip":"192.168.1.1"}',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(mockToken as any);

      const metadata = { ip: '192.168.1.1' };
      await generateQRToken('hotel-1', 'user-1', 'staff', 'admin-1', metadata);

      expect(prisma.guestStaffQRToken.create).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.guestStaffQRToken.create).mock.calls[0][0];
      expect(callArgs.data.hotelId).toBe('hotel-1');
      expect(callArgs.data.userId).toBe('user-1');
      expect(callArgs.data.role).toBe('staff');
      expect(callArgs.data.createdBy).toBe('admin-1');
    });
  });

  describe('validateQRToken', () => {
    it('should validate token successfully', async () => {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
      const payload: QRTokenPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      };

      const token = sign(payload, JWT_SECRET, { algorithm: 'HS256' });

      const mockDBToken = {
        id: 'token-1',
        token,
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        isUsed: false,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: {
          id: 'user-1',
          email: 'guest@example.com',
          name: 'Guest',
          hotelId: 'hotel-1',
          role: 'user',
        },
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockDBToken as any);
      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue(mockDBToken as any);

      const result = await validateQRToken(token, 'hotel-1');

      expect(result.hotelId).toBe('hotel-1');
      expect(result.userId).toBe('user-1');
      expect(result.role).toBe('guest');
      expect(result.type).toBe('qr-login');
      expect(prisma.guestStaffQRToken.update).toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      await expect(validateQRToken('invalid-token', 'hotel-1')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error if token is revoked', async () => {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
      const payload: QRTokenPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      };

      const token = sign(payload, JWT_SECRET, { algorithm: 'HS256' });

      const mockDBToken = {
        id: 'token-1',
        token,
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        isUsed: false,
        revokedAt: new Date(), // Token is revoked
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-1', email: 'guest@example.com', hotelId: 'hotel-1' },
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockDBToken as any);

      await expect(validateQRToken(token, 'hotel-1')).rejects.toThrow(
        'Token has been revoked'
      );
    });

    it('should throw error if token has been used', async () => {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
      const payload: QRTokenPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      };

      const token = sign(payload, JWT_SECRET, { algorithm: 'HS256' });

      const mockDBToken = {
        id: 'token-1',
        token,
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        isUsed: true, // Token already used
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-1', email: 'guest@example.com', hotelId: 'hotel-1' },
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockDBToken as any);

      await expect(validateQRToken(token, 'hotel-1')).rejects.toThrow(
        'Token has already been used'
      );
    });

    it('should throw error if token is expired', async () => {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
      const expiredTime = Math.floor((Date.now() - 60 * 60 * 1000) / 1000); // 1 hour ago
      const payload: QRTokenPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        iat: Math.floor(Date.now() / 1000),
        exp: expiredTime,
      };

      const token = sign(payload, JWT_SECRET, { algorithm: 'HS256' });

      await expect(validateQRToken(token, 'hotel-1')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error if hotel mismatch', async () => {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
      const payload: QRTokenPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      };

      const token = sign(payload, JWT_SECRET, { algorithm: 'HS256' });

      await expect(validateQRToken(token, 'hotel-2')).rejects.toThrow(
        'Hotel mismatch'
      );
    });

    it('should mark token as used after validation', async () => {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
      const payload: QRTokenPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      };

      const token = sign(payload, JWT_SECRET, { algorithm: 'HS256' });

      const mockDBToken = {
        id: 'token-1',
        token,
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        isUsed: false,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: {
          id: 'user-1',
          email: 'guest@example.com',
          name: 'Guest',
          hotelId: 'hotel-1',
          role: 'user',
        },
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockDBToken as any);
      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue(mockDBToken as any);

      await validateQRToken(token, 'hotel-1');

      expect(prisma.guestStaffQRToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: {
          isUsed: true,
          usedAt: expect.any(Date),
        },
      });
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      const mockToken = {
        id: 'token-1',
        token: 'jwt-abc',
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(mockToken as any);
      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue({
        ...mockToken,
        revokedAt: new Date(),
        revokedBy: 'admin-1',
      } as any);

      await revokeToken('token-1', 'admin-1');

      expect(prisma.guestStaffQRToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: {
          revokedAt: expect.any(Date),
          revokedBy: 'admin-1',
        },
      });
    });

    it('should throw error if token not found', async () => {
      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(null);

      await expect(revokeToken('unknown-token')).rejects.toThrow('Token not found');
    });
  });

  describe('listActiveTokens', () => {
    it('should list active tokens with pagination', async () => {
      const mockTokens = [
        {
          id: 'token-1',
          hotelId: 'hotel-1',
          userId: 'user-1',
          token: 'jwt-1',
          role: 'guest',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isUsed: false,
          revokedAt: null,
          user: { id: 'user-1', name: 'Guest', email: 'guest@example.com' },
        },
      ];

      vi.mocked(prisma.guestStaffQRToken.findMany).mockResolvedValue(mockTokens as any);
      vi.mocked(prisma.guestStaffQRToken.count).mockResolvedValue(1);

      const result = await listActiveTokens('hotel-1', 20, 0);

      expect(result.tokens).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should return empty list if no active tokens', async () => {
      vi.mocked(prisma.guestStaffQRToken.findMany).mockResolvedValue([]);
      vi.mocked(prisma.guestStaffQRToken.count).mockResolvedValue(0);

      const result = await listActiveTokens('hotel-1');

      expect(result.tokens).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUserTokens', () => {
    it('should get all tokens for a user', async () => {
      const mockTokens = [
        {
          id: 'token-1',
          hotelId: 'hotel-1',
          userId: 'user-1',
          token: 'jwt-1',
          role: 'guest',
          expiresAt: new Date(),
          isUsed: false,
        },
      ];

      vi.mocked(prisma.guestStaffQRToken.findMany).mockResolvedValue(mockTokens as any);

      const result = await getUserTokens('user-1', 'hotel-1');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });
  });

  describe('regenerateToken', () => {
    it('should regenerate token successfully', async () => {
      const oldToken = {
        id: 'token-1',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-old',
        role: 'guest',
        metadata: null,
      };

      const newTokenData = {
        id: 'token-2',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-new',
        role: 'guest',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      const mockUser = {
        id: 'user-1',
        email: 'guest@example.com',
        name: 'Guest',
        hotelId: 'hotel-1',
      };

      vi.mocked(prisma.guestStaffQRToken.findUnique).mockResolvedValue(oldToken as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.guestStaffQRToken.update).mockResolvedValue({ ...oldToken, revokedAt: new Date() } as any);
      vi.mocked(prisma.guestStaffQRToken.create).mockResolvedValue(newTokenData as any);

      const result = await regenerateToken('token-1', 'admin-1');

      expect(result.token).toBe('jwt-new');
      expect(result.role).toBe('guest');
      expect(prisma.guestStaffQRToken.create).toHaveBeenCalled();
    });
  });

  describe('getTokenStats', () => {
    it('should return token statistics', async () => {
      vi.mocked(prisma.guestStaffQRToken.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(3) // used
        .mockResolvedValueOnce(1) // expired
        .mockResolvedValueOnce(1); // revoked

      vi.mocked(prisma.guestStaffQRToken.groupBy).mockResolvedValue([
        { role: 'guest', _count: 6 },
        { role: 'staff', _count: 4 },
      ] as any);

      const result = await getTokenStats('hotel-1');

      expect(result.total).toBe(10);
      expect(result.active).toBe(5);
      expect(result.used).toBe(3);
      expect(result.expired).toBe(1);
      expect(result.revoked).toBe(1);
      expect(result.byRole.guest).toBe(6);
      expect(result.byRole.staff).toBe(4);
    });
  });
});
