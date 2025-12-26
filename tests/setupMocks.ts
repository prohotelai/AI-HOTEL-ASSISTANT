import { vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { validateHotelQr } from '@/lib/services/hotelQrService'

// Ensure critical env vars exist for tests that import env-dependent modules
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db'

// Provide a default mock for the lightweight DB client used in QR services
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    guestStaffQRToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn()
    },
    // Add minimal models referenced in QR automation tests
    pmsWorkOrderHistory: {
      create: vi.fn(async ({ data }: any) => ({ ...data, id: data?.id || `pms_${Date.now()}` })),
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 }))
    },
    userSessionLog: (() => {
      const store: any[] = []
      return {
        create: vi.fn(async ({ data }: any) => {
          const record = { ...data, id: data?.id || `sess_${store.length + 1}` }
          store.push(record)
          return record
        }),
        findMany: vi.fn(async ({ where }: any = {}) => {
          if (where?.hotelId) {
            return store.filter((s) => s.hotelId === where.hotelId)
          }
          return [...store]
        }),
        deleteMany: vi.fn(async ({ where }: any = {}) => {
          const before = store.length
          if (where?.hotelId) {
            for (let i = store.length - 1; i >= 0; i--) {
              if (store[i].hotelId === where.hotelId) store.splice(i, 1)
            }
          } else {
            store.splice(0, store.length)
          }
          return { count: before - store.length }
        }),
        count: vi.fn(async () => store.length)
      }
    })()
  }
}))

// Simple in-memory storage polyfill for jsdom-less environments
class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

const globalAny = globalThis as any
if (!globalAny.localStorage) {
  globalAny.localStorage = new MemoryStorage()
}
if (!globalAny.sessionStorage) {
  globalAny.sessionStorage = new MemoryStorage()
}

// Minimal in-memory ServiceConfig implementation to satisfy integration tests
type ServiceConfigRecord = {
  id: string
  hotelId: string
  aiGuestChat: boolean
  analyticsDashboard: boolean
  guestPrivacyMode: boolean
  configuredBy?: string
  configuredAt: Date
  updatedAt: Date
  createdAt: Date
}

const serviceConfigStore = new Map<string, ServiceConfigRecord>()

function ensureServiceConfigMock() {
  const client = prisma as any
  if (client._serviceConfigMock) return

  client._serviceConfigMock = true
  client.serviceConfig = {
    async upsert({ where, create, update }: any) {
      const hotelId = where.hotelId
      const existing = serviceConfigStore.get(hotelId)

      if (existing) {
        const updated: ServiceConfigRecord = {
          ...existing,
          ...update,
          updatedAt: update?.updatedAt ?? new Date()
        }
        serviceConfigStore.set(hotelId, updated)
        return updated
      }

      const record: ServiceConfigRecord = {
        id: create.id ?? `svc_${serviceConfigStore.size + 1}`,
        hotelId,
        aiGuestChat: create.aiGuestChat ?? true,
        analyticsDashboard: create.analyticsDashboard ?? true,
        guestPrivacyMode: create.guestPrivacyMode ?? true,
        configuredBy: create.configuredBy,
        configuredAt: create.configuredAt ?? new Date(),
        createdAt: create.createdAt ?? new Date(),
        updatedAt: update?.updatedAt ?? new Date()
      }

      serviceConfigStore.set(hotelId, record)
      return record
    },
    async create({ data }: any) {
      if (serviceConfigStore.has(data.hotelId)) {
        throw new Error('ServiceConfig already exists for hotel')
      }

      const record: ServiceConfigRecord = {
        id: data.id ?? `svc_${serviceConfigStore.size + 1}`,
        hotelId: data.hotelId,
        aiGuestChat: data.aiGuestChat ?? true,
        analyticsDashboard: data.analyticsDashboard ?? true,
        guestPrivacyMode: data.guestPrivacyMode ?? true,
        configuredBy: data.configuredBy,
        configuredAt: data.configuredAt ?? new Date(),
        createdAt: data.createdAt ?? new Date(),
        updatedAt: data.updatedAt ?? new Date()
      }

      serviceConfigStore.set(data.hotelId, record)
      return record
    },
    async deleteMany({ where }: any) {
      const hotelId = where?.hotelId
      const existed = hotelId && serviceConfigStore.has(hotelId)
      if (existed) {
        serviceConfigStore.delete(hotelId)
      }
      return { count: existed ? 1 : 0 }
    },
    async delete({ where }: any) {
      const id = where?.id
      const existing = Array.from(serviceConfigStore.values()).find(cfg => cfg.id === id)
      if (!existing) {
        throw new Error('ServiceConfig not found')
      }
      serviceConfigStore.delete(existing.hotelId)
      return existing
    },
    async findUnique({ where }: any) {
      return where?.hotelId ? serviceConfigStore.get(where.hotelId) ?? null : null
    }
  }
}

ensureServiceConfigMock()

// Provide default stubs for QR token and stay models used in unit tests
const prismaAny = prisma as any
prismaAny.qRToken = prismaAny.qRToken || { create: vi.fn(), updateMany: vi.fn() }
prismaAny.stay = prismaAny.stay || { create: vi.fn(), update: vi.fn() }

// Basic fetch stub to avoid real network calls during unit tests
const mockFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input.toString(), init)
  const url = new URL(request.url)
  const method = request.method.toUpperCase()

  if (url.host === 'localhost:3000') {
    const bodyText = request.body ? await request.text() : ''
    const parsedBody = bodyText ? JSON.parse(bodyText) : {}

    if (url.pathname === '/api/auth/signin' && method === 'POST') {
      const { email, password } = parsedBody
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400 })
      }
      if (password !== 'password123') {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
      }
      return new Response(
        JSON.stringify({ user: { email }, token: 'mock-jwt-token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (url.pathname === '/api/auth/magic-link' && method === 'POST') {
      const { email } = parsedBody
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 })
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    // QR endpoints (legacy + validation)
    if (url.pathname.startsWith('/api/qr/') && method === 'POST') {
      if (url.pathname === '/api/qr/validate') {
        const { qrCode, token, hotelId } = parsedBody
        const codeToValidate = qrCode || token

        if (!codeToValidate) {
          return new Response(JSON.stringify({ error: 'qrCode is required' }), { status: 400 })
        }

        const validation = await validateHotelQr(codeToValidate)

        if (!validation) {
          return new Response(JSON.stringify({ error: 'Invalid QR code' }), { status: 401 })
        }

        if (hotelId && hotelId !== validation.hotelId) {
          return new Response(JSON.stringify({ error: 'Hotel mismatch' }), { status: 401 })
        }

        return new Response(
          JSON.stringify({
            success: true,
            hotelId: validation.hotelId,
            hotelName: validation.hotelName,
            payload: validation.payload,
            deprecated: false
          }),
          { status: 200 }
        )
      }

      // Legacy QR generate endpoints return 410 Gone
      return new Response(
        JSON.stringify({
          error: 'QR code generation is no longer available',
          deprecated: true,
          message: 'Hotel QR codes are permanent. Use GET /api/qr/[hotelId] instead.'
        }),
        { status: 410 }
      )
    }

    if (url.pathname.startsWith('/api/qr/') && method === 'GET') {
      // Without auth context, default to unauthorized for QR retrieval
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
}

vi.stubGlobal('fetch', mockFetch)
