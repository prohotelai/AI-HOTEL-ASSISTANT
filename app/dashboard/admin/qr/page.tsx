'use client';

export const dynamic = 'force-dynamic'

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  QrCodeIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface QRToken {
  id: string;
  hotelId: string;
  userId: string;
  token: string;
  role: 'guest' | 'staff';
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface TokenStats {
  total: number;
  active: number;
  used: number;
  expired: number;
  revoked: number;
  byRole: { guest: number; staff: number };
}

interface PaginationData {
  limit: number;
  offset: number;
  total: number;
}

/**
 * Admin QR Code Management Dashboard
 * Allows admins to:
 * - Generate new QR tokens for guests and staff
 * - View all active tokens
 * - Revoke tokens
 * - Regenerate tokens
 * - View token usage statistics
 */
export default function QRManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State management
  const [tokens, setTokens] = useState<QRToken[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    limit: 20,
    offset: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedToken, setSelectedToken] = useState<QRToken | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    userId: '',
    role: 'guest' as 'guest' | 'staff',
    userEmail: '',
    userName: '',
  });

  const [hotelId, setHotelId] = useState<string>('');
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [filteredUsers, setFilteredUsers] = useState(users);
  const [userSearch, setUserSearch] = useState('');

  const fetchHotelUsers = useCallback(async (hotel: string) => {
    try {
      const res = await fetch(`/api/users?hotelId=${hotel}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const fetchHotelInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/session/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.hotelId) {
          setHotelId(data.user.hotelId);
          await fetchHotelUsers(data.user.hotelId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch hotel info:', err);
    }
  }, [fetchHotelUsers]);

  const loadTokens = useCallback(
    async (offset: number = 0) => {
      if (!hotelId) return;

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          hotelId,
          limit: '20',
          offset: offset.toString(),
          stats: 'true',
        });

        const res = await fetch(`/api/qr/tokens?${params}`);

        if (!res.ok) {
          throw new Error('Failed to load tokens');
        }

        const data = await res.json();

        setTokens(data.tokens || []);
        setPagination(data.pagination || { limit: 20, offset: 0, total: 0 });
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tokens');
      } finally {
        setLoading(false);
      }
    },
    [hotelId]
  );

  const userEmail = session?.user?.email;

  // Load hotel ID from session
  useEffect(() => {
    if (userEmail) {
      void fetchHotelInfo();
    }
  }, [fetchHotelInfo, userEmail]);

  // Load tokens when hotel ID is available
  useEffect(() => {
    if (hotelId) {
      void loadTokens();
    }
  }, [hotelId, loadTokens]);

  // Filter users based on search
  useEffect(() => {
    const filtered = users.filter((user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [userSearch, users]);

  /**
   * Fetch hotel information
   */
  /**
   * Generate new QR token
   */
  async function handleGenerateToken() {
    if (!formData.userId || !formData.role) {
      setError('Please select a user and role');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          userId: formData.userId,
          role: formData.role,
          metadata: {
            generatedAt: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate token');
      }

      setSuccess('QR token generated successfully');
      setShowGenerateModal(false);
      resetForm();
      await loadTokens();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Revoke token
   */
  async function handleRevokeToken() {
    if (!selectedToken) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/qr/tokens/${selectedToken.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to revoke token');
      }

      setSuccess('Token revoked successfully');
      setShowConfirmDelete(false);
      setSelectedToken(null);
      await loadTokens();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke token');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Regenerate token
   */
  async function handleRegenerateToken(tokenId: string) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/qr/tokens/${tokenId}/regenerate`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to regenerate token');
      }

      setSuccess('Token regenerated successfully');
      await loadTokens();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate token');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Reset form data
   */
  function resetForm() {
    setFormData({
      userId: '',
      role: 'guest',
      userEmail: '',
      userName: '',
    });
  }

  /**
   * Format date
   */
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Check if token is expired
   */
  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  /**
   * Check if token is active
   */
  function isActive(token: QRToken): boolean {
    return !token.isUsed && !isExpired(token.expiresAt);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <QrCodeIcon className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p>Loading QR management...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <QrCodeIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">QR Code Management</h1>
        </div>
        <p className="text-gray-600">Generate and manage QR login tokens for guests and staff</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Total Tokens</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Active</p>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Used</p>
            <p className="text-3xl font-bold text-blue-600">{stats.used}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Expired</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.expired}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Revoked</p>
            <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Generate QR Token
        </button>
      </div>

      {/* Tokens Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Expires</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Used At</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No QR tokens found
                </td>
              </tr>
            ) : (
              tokens.map((token) => (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{token.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{token.user?.email || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        token.role === 'guest'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {token.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isActive(token) && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                    {token.isUsed && !isExpired(token.expiresAt) && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Used
                      </span>
                    )}
                    {isExpired(token.expiresAt) && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(token.expiresAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {token.usedAt ? formatDate(token.usedAt) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(token.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!isExpired(token.expiresAt) && !token.isUsed && (
                        <button
                          onClick={() => handleRegenerateToken(token.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Regenerate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedToken(token);
                          setShowConfirmDelete(true);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              void loadTokens(Math.max(0, pagination.offset - pagination.limit));
            }}
            disabled={pagination.offset === 0}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
            {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => {
              void loadTokens(pagination.offset + pagination.limit);
            }}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Generate QR Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Generate QR Token</h2>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetForm();
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Search Users */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Search User
              </label>
              <input
                type="text"
                placeholder="Search by name or email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Select User */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                User
              </label>
              <select
                value={formData.userId}
                onChange={(e) => {
                  const user = users.find((u) => u.id === e.target.value);
                  setFormData({
                    ...formData,
                    userId: e.target.value,
                    userName: user?.name || '',
                    userEmail: user?.email || '',
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a user</option>
                {filteredUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Role */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'guest' | 'staff',
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="guest">Guest</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetForm();
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateToken}
                disabled={!formData.userId || !formData.role}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDelete && selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex gap-3 mb-6">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Revoke Token?</h2>
                <p className="text-gray-600 text-sm mt-1">
                  This will revoke the QR token for {selectedToken.user?.name || 'this user'}. They
                  will no longer be able to use this token to log in.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setSelectedToken(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeToken}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

