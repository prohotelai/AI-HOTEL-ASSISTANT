// tests/helpers/authHelpers.ts
import { Session } from 'next-auth'
import jwt from 'jsonwebtoken'

export interface MockUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'GUEST'
  hotelId: string
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    user: {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STAFF',
      hotelId: 'hotel-1',
      ...overrides.user,
    } as any,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

export function createMockJWT(claims: Partial<Record<string, any>> = {}): string {
  return jwt.sign(
    {
      sub: 'test-user-1',
      email: 'test@example.com',
      role: 'STAFF',
      hotelId: 'hotel-1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      ...claims,
    },
    process.env.NEXTAUTH_SECRET || 'test-secret'
  )
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'STAFF',
    hotelId: 'hotel-1',
    ...overrides,
  }
}

export const mockAdminUser = createMockUser({ role: 'ADMIN', email: 'admin@example.com' })
export const mockStaffUser = createMockUser({ role: 'STAFF', email: 'staff@example.com' })
export const mockGuestUser = createMockUser({ role: 'GUEST', email: 'guest@example.com' })
export const mockManagerUser = createMockUser({ role: 'MANAGER', email: 'manager@example.com' })

export function expectAuthError(response: Response) {
  expect(response.status).toBe(401)
}

export function expectPermissionError(response: Response) {
  expect(response.status).toBe(403)
}
