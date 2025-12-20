import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RESTAdapter, CloudbedsRESTAdapter } from '@/lib/pms/adapters/rest'
import { PMSIntegrationError } from '@/lib/pms/errors'

global.fetch = vi.fn()

describe('RESTAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('request', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'success' }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)

      const adapter = new RESTAdapter('https://api.example.com')
      const result = await adapter.get('/test')

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should retry on 500 error', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)

      const adapter = new RESTAdapter('https://api.example.com', {}, {
        maxRetries: 3,
        initialDelay: 100,
      })

      const result = await adapter.get('/test')

      expect(result).toEqual({ data: 'success' })
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response)

      const adapter = new RESTAdapter('https://api.example.com', {}, {
        maxRetries: 2,
        initialDelay: 10,
      })

      await expect(adapter.get('/test')).rejects.toThrow(PMSIntegrationError)
      expect(fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not retry on 400 error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response)

      const adapter = new RESTAdapter('https://api.example.com')

      await expect(adapter.get('/test')).rejects.toThrow(PMSIntegrationError)
      expect(fetch).toHaveBeenCalledTimes(1) // No retries
    })

    it('should handle timeout', async () => {
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({} as Response), 5000)
          })
      )

      const adapter = new RESTAdapter('https://api.example.com')

      await expect(adapter.request('/test', { timeout: 100 })).rejects.toThrow(
        'PMS API request timed out'
      )
    })

    it('should make POST request with body', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)

      const adapter = new RESTAdapter('https://api.example.com')
      const body = { name: 'Test' }

      await adapter.post('/test', body)

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })

  describe('CloudbedsRESTAdapter', () => {
    it('should include authorization header', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ reservations: [] }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)

      const adapter = new CloudbedsRESTAdapter('test-api-key')
      await adapter.getReservations('property-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      )
    })

    it('should append since parameter when provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ reservations: [] }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)

      const adapter = new CloudbedsRESTAdapter('test-api-key')
      const since = new Date('2025-01-01')

      await adapter.getReservations('property-123', since)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('modifiedSince=2025-01-01'),
        expect.any(Object)
      )
    })
  })
})
