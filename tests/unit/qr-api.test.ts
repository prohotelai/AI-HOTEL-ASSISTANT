/**
 * Unit Tests for QR API Endpoints
 * Tests: Generate, validate, list, revoke, and regenerate endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/rbac/permissions', () => ({
  checkPermission: vi.fn(),
}));

vi.mock('@/lib/services/qr/qrService', () => ({
  generateQRToken: vi.fn(),
  validateQRToken: vi.fn(),
  revokeToken: vi.fn(),
  listActiveTokens: vi.fn(),
  regenerateToken: vi.fn(),
  getTokenStats: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST as generateQRPost } from '@/app/api/qr/generate/route';
import { POST as validateQRPost } from '@/app/api/qr/validate/route';
import { GET as getTokensGet } from '@/app/api/qr/tokens/route';
import { DELETE as revokeTokenDelete } from '@/app/api/qr/tokens/[tokenId]/route';
import { POST as regenerateTokenPost } from '@/app/api/qr/tokens/[tokenId]/regenerate/route';
import { checkPermission } from '@/lib/rbac/permissions';
import {
  generateQRToken,
  validateQRToken,
  revokeToken,
  listActiveTokens,
  regenerateToken,
} from '@/lib/services/qr/qrService';

describe('QR API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/qr/generate', () => {
    it('should generate QR token with valid request', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

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
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(generateQRToken).mockResolvedValue(mockToken as any);

      const request = new NextRequest('http://localhost/api/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: 'hotel-1',
          userId: 'user-1',
          role: 'guest',
        }),
      });

      const response = await generateQRPost(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.token.role).toBe('guest');
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: 'hotel-1',
          userId: 'user-1',
          role: 'guest',
        }),
      });

      const response = await generateQRPost(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 if insufficient permissions', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: 'hotel-1',
          userId: 'user-1',
          role: 'guest',
        }),
      });

      const response = await generateQRPost(request);
      expect(response.status).toBe(403);
    });

    it('should return 400 if missing required fields', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: 'hotel-1',
          // Missing userId and role
        }),
      });

      const response = await generateQRPost(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 if invalid role', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: 'hotel-1',
          userId: 'user-1',
          role: 'invalid',
        }),
      });

      const response = await generateQRPost(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/qr/validate', () => {
    it('should validate token and return session', async () => {
      const mockQRPayload = {
        hotelId: 'hotel-1',
        userId: 'user-1',
        role: 'guest',
        tokenId: 'token-123',
        type: 'qr-login',
        user: {
          id: 'user-1',
          email: 'guest@example.com',
          name: 'Guest',
        },
      };

      const mockUser = {
        id: 'user-1',
        email: 'guest@example.com',
        name: 'Guest',
        userRoles: [
          {
            role: {
              rolePermissions: [
                {
                  permission: {
                    key: 'widget.guest-session',
                  },
                },
              ],
            },
          },
        ],
      };

      vi.mocked(validateQRToken).mockResolvedValue(mockQRPayload as any);

      const request = new NextRequest('http://localhost/api/qr/validate', {
        method: 'POST',
        body: JSON.stringify({
          token: 'jwt-token',
          hotelId: 'hotel-1',
        }),
      });

      const response = await validateQRPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.role).toBe('guest');
    });

    it('should return 400 if missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/qr/validate', {
        method: 'POST',
        body: JSON.stringify({
          token: 'jwt-token',
          // Missing hotelId
        }),
      });

      const response = await validateQRPost(request);
      expect(response.status).toBe(400);
    });

    it('should return 401 if token invalid', async () => {
      vi.mocked(validateQRToken).mockRejectedValue(new Error('Invalid or expired token'));

      const request = new NextRequest('http://localhost/api/qr/validate', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
          hotelId: 'hotel-1',
        }),
      });

      const response = await validateQRPost(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 if token already used', async () => {
      vi.mocked(validateQRToken).mockRejectedValue(new Error('Token has been used'));

      const request = new NextRequest('http://localhost/api/qr/validate', {
        method: 'POST',
        body: JSON.stringify({
          token: 'used-token',
          hotelId: 'hotel-1',
        }),
      });

      const response = await validateQRPost(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 if token revoked', async () => {
      vi.mocked(validateQRToken).mockRejectedValue(new Error('Token has been revoked'));

      const request = new NextRequest('http://localhost/api/qr/validate', {
        method: 'POST',
        body: JSON.stringify({
          token: 'revoked-token',
          hotelId: 'hotel-1',
        }),
      });

      const response = await validateQRPost(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/qr/tokens', () => {
    it('should list active tokens with pagination', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      const mockTokensData = {
        tokens: [
          {
            id: 'token-1',
            hotelId: 'hotel-1',
            userId: 'user-1',
            token: 'jwt-1',
            role: 'guest',
            expiresAt: new Date(),
            isUsed: false,
            usedAt: null,
            createdAt: new Date(),
          },
        ],
        pagination: {
          limit: 20,
          offset: 0,
          total: 1,
        },
      };

      const mockStats = {
        total: 1,
        active: 1,
        used: 0,
        expired: 0,
        revoked: 0,
        byRole: { guest: 1, staff: 0 },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(listActiveTokens).mockResolvedValue(mockTokensData as any);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens?hotelId=hotel-1&limit=20&offset=0&stats=true',
        {
          method: 'GET',
        }
      );

      const response = await getTokensGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tokens).toHaveLength(1);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens?hotelId=hotel-1',
        {
          method: 'GET',
        }
      );

      const response = await getTokensGet(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 if insufficient permissions', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(false);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens?hotelId=hotel-1',
        {
          method: 'GET',
        }
      );

      const response = await getTokensGet(request);
      expect(response.status).toBe(403);
    });

    it('should return 400 if hotelId missing', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/qr/tokens', {
        method: 'GET',
      });

      const response = await getTokensGet(request);
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/qr/tokens/[tokenId]', () => {
    it('should revoke token successfully', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(revokeToken).mockResolvedValue(undefined);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/token-1',
        {
          method: 'DELETE',
        }
      );

      const response = await revokeTokenDelete(request, {
        params: { tokenId: 'token-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/token-1',
        {
          method: 'DELETE',
        }
      );

      const response = await revokeTokenDelete(request, {
        params: { tokenId: 'token-1' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 if insufficient permissions', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(false);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/token-1',
        {
          method: 'DELETE',
        }
      );

      const response = await revokeTokenDelete(request, {
        params: { tokenId: 'token-1' },
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 if token not found', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(revokeToken).mockRejectedValue(new Error('Token not found'));

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/unknown-token',
        {
          method: 'DELETE',
        }
      );

      const response = await revokeTokenDelete(request, {
        params: { tokenId: 'unknown-token' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/qr/tokens/[tokenId]/regenerate', () => {
    it('should regenerate token successfully', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      const mockNewToken = {
        id: 'token-2',
        hotelId: 'hotel-1',
        userId: 'user-1',
        token: 'jwt-new',
        role: 'guest',
        expiresAt: new Date(),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(regenerateToken).mockResolvedValue(mockNewToken as any);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/token-1/regenerate',
        {
          method: 'POST',
        }
      );

      const response = await regenerateTokenPost(request, {
        params: { tokenId: 'token-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.token.token).toBe('jwt-new');
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/token-1/regenerate',
        {
          method: 'POST',
        }
      );

      const response = await regenerateTokenPost(request, {
        params: { tokenId: 'token-1' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 if token not found', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(regenerateToken).mockRejectedValue(new Error('Token not found'));

      const request = new NextRequest(
        'http://localhost/api/qr/tokens/unknown-token/regenerate',
        {
          method: 'POST',
        }
      );

      const response = await regenerateTokenPost(request, {
        params: { tokenId: 'unknown-token' },
      });

      expect(response.status).toBe(404);
    });
  });
});
