import { describe, it, expect, vi } from 'vitest'
import { GraphQLAdapter, MewsGraphQLAdapter } from '@/lib/pms/adapters/graphql'
import { PMSIntegrationError } from '@/lib/pms/errors'

global.fetch = vi.fn()

describe('GraphQLAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('query', () => {
    it('should execute GraphQL query successfully', async () => {
      const mockData = { users: [{ id: '1', name: 'John' }] }
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: mockData }),
      } as Response)

      const adapter = new GraphQLAdapter('https://api.example.com/graphql')
      const result = await adapter.query('{ users { id name } }')

      expect(result).toEqual(mockData)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/graphql',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: '{ users { id name } }',
            variables: undefined,
          }),
        })
      )
    })

    it('should pass variables to query', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: { user: { id: '1' } } }),
      } as Response)

      const adapter = new GraphQLAdapter('https://api.example.com/graphql')
      const variables = { userId: '1' }

      await adapter.query('query GetUser($userId: ID!) { user(id: $userId) { id } }', {
        variables,
      })

      const [, options] = vi.mocked(fetch).mock.calls[0]
      const payload = JSON.parse((options as any).body as string)

      expect(payload.variables).toEqual(variables)
      expect(typeof payload.query).toBe('string')
    })

    it('should throw error on GraphQL errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          errors: [{ message: 'Field not found' }],
        }),
      } as Response)

      const adapter = new GraphQLAdapter('https://api.example.com/graphql')

      await expect(adapter.query('{ invalid }')).rejects.toThrow('GraphQL error: Field not found')
    })

    it('should throw error on missing data', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({}),
      } as Response)

      const adapter = new GraphQLAdapter('https://api.example.com/graphql')

      await expect(adapter.query('{ users }')).rejects.toThrow('GraphQL response missing data')
    })

    it('should handle timeout', async () => {
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({} as Response), 5000)
          })
      )

      const adapter = new GraphQLAdapter('https://api.example.com/graphql')

      await expect(adapter.query('{ users }', { timeout: 100 })).rejects.toThrow(
        'GraphQL request timed out'
      )
    })
  })

  describe('MewsGraphQLAdapter', () => {
    it('should include authorization header', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: { reservations: [] } }),
      } as Response)

      const adapter = new MewsGraphQLAdapter('test-token')
      await adapter.getReservations('enterprise-123')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mews.com/graphql',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('should include since parameter when provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: { reservations: [] } }),
      } as Response)

      const adapter = new MewsGraphQLAdapter('test-token')
      const since = new Date('2025-01-01')

      await adapter.getReservations('enterprise-123', since)

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('2025-01-01'),
        })
      )
    })

    it('should execute getRooms query', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: { resources: [] } }),
      } as Response)

      const adapter = new MewsGraphQLAdapter('test-token')
      const result = await adapter.getRooms('enterprise-123')

      expect(result).toEqual({ resources: [] })
    })

    it('should execute getCustomers query', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: { customers: [] } }),
      } as Response)

      const adapter = new MewsGraphQLAdapter('test-token')
      const result = await adapter.getCustomers('enterprise-123')

      expect(result).toEqual({ customers: [] })
    })
  })

  describe('mutate', () => {
    it('should execute mutations', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ data: { createUser: { id: '1' } } }),
      } as Response)

      const adapter = new GraphQLAdapter('https://api.example.com/graphql')
      const mutation = 'mutation { createUser(name: "John") { id } }'

      const result = await adapter.mutate(mutation)

      expect(result).toEqual({ createUser: { id: '1' } })
    })
  })
})
