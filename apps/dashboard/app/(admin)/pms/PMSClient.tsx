'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Configuration = {
  id: string
  provider: string
  enabled: boolean
}

type SyncLog = {
  id: string
  provider: string
  entityType: string
  status: string
}

type PMSClientProps = {
  hotelId: string
  configurations: Configuration[]
  recentSyncLogs: SyncLog[]
}

export function PMSClient({ hotelId, configurations, recentSyncLogs }: PMSClientProps) {
  const [syncingBookings, setSyncingBookings] = useState(false)
  const [syncingRooms, setSyncingRooms] = useState(false)
  const [syncingGuests, setSyncingGuests] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const activeProviders = configurations.filter((c) => c.enabled)

  if (activeProviders.length === 0) {
    return null
  }

  const syncBookings = async (provider: string) => {
    setSyncingBookings(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pms/sync/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, limit: 100 }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully synced ${result.summary.processed} bookings (${result.summary.failed} failed)`,
        })
        // Refresh page after a delay
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to sync bookings',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setSyncingBookings(false)
    }
  }

  const syncRooms = async (provider: string) => {
    setSyncingRooms(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pms/sync/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, limit: 500 }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully synced ${result.summary.processed} rooms (${result.summary.failed} failed)`,
        })
        // Refresh page after a delay
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to sync rooms',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setSyncingRooms(false)
    }
  }

  const syncGuests = async (provider: string) => {
    setSyncingGuests(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pms/sync/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, limit: 500 }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully synced ${result.summary.processed} guests (${result.summary.failed} failed)`,
        })
        // Refresh page after a delay
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to sync guests',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setSyncingGuests(false)
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Manual Sync</h2>

      {message && (
        <div
          className={`rounded-2xl p-4 ${
            message.type === 'success'
              ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : 'border border-rose-400/30 bg-rose-400/10 text-rose-100'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {activeProviders.map((config) => (
          <div
            key={config.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="font-semibold text-white capitalize mb-4">{config.provider}</h3>

            <div className="space-y-3">
              <Button
                className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50"
                disabled={syncingBookings}
                onClick={() => syncBookings(config.provider)}
              >
                {syncingBookings ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> Sync Bookings
                  </>
                )}
              </Button>

              <Button
                className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50"
                disabled={syncingRooms}
                onClick={() => syncRooms(config.provider)}
              >
                {syncingRooms ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> Sync Rooms
                  </>
                )}
              </Button>

              <Button
                className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50"
                onClick={() => syncGuests(config.provider)}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Sync Guests
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-4">
        <p className="text-xs text-blue-100/80">
          💡 <strong>Tip:</strong> Manual syncs are useful for testing or immediate updates. Configure automatic sync
          schedules in provider settings for regular updates.
        </p>
      </div>
    </section>
  )
}
