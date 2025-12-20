'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

interface UseRealtimeOptions {
  enabled?: boolean
  autoSubscribe?: string[]
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

interface RealtimeEvent {
  type: string
  data: any
  timestamp: Date
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { data: session } = useSession()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const listeners = useRef<Map<string, Set<Function>>>(new Map())

  const {
    enabled = true,
    autoSubscribe: autoSubscribeInput,
    onConnect,
    onDisconnect,
    onError: onErrorCallback
  } = options

  const autoSubscribe = useMemo(() => autoSubscribeInput ?? [], [autoSubscribeInput])

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !session?.user) return

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      auth: {
        token: session.user.id
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    })

    // Connection handlers
    socket.on('connect', () => {
      console.log('[Realtime] Connected')
      setIsConnected(true)
      setError(null)

      // Auto-subscribe to channels
      autoSubscribe.forEach((channel) => {
        socket.emit('subscribe', channel)
      })

      onConnect?.()
    })

    socket.on('disconnect', () => {
      console.log('[Realtime] Disconnected')
      setIsConnected(false)
      onDisconnect?.()
    })

    socket.on('connect_error', (error) => {
      console.error('[Realtime] Connection error:', error)
      setError(new Error(`Connection error: ${error.message}`))
      onErrorCallback?.(error)
    })

    socket.on('error', (error) => {
      console.error('[Realtime] Socket error:', error)
      setError(new Error(`Socket error: ${error}`))
      onErrorCallback?.(new Error(`Socket error: ${error}`))
    })

    // Generic event listener for all events
    socket.onAny((event, data) => {
      const realtimeEvent = {
        type: event,
        data,
        timestamp: new Date()
      }
      setLastEvent(realtimeEvent)

      // Call registered listeners
      const eventListeners = listeners.current.get(event)
      if (eventListeners) {
        eventListeners.forEach((callback) => {
          try {
            callback(data)
          } catch (err) {
            console.error(`Error in listener for event ${event}:`, err)
          }
        })
      }
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [autoSubscribe, enabled, onConnect, onDisconnect, onErrorCallback, session?.user])

  // Subscribe to event
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!listeners.current.has(event)) {
      listeners.current.set(event, new Set())
    }
    listeners.current.get(event)!.add(callback)

    return () => {
      const callbacks = listeners.current.get(event)
      if (callbacks) {
        callbacks.delete(callback)
      }
    }
  }, [])

  // Emit event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  // Subscribe to room/channel
  const subscribe = useCallback((channel: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', channel)
    }
  }, [])

  // Unsubscribe from room/channel
  const unsubscribe = useCallback((channel: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', channel)
    }
  }, [])

  return {
    isConnected,
    lastEvent,
    error,
    on,
    emit,
    subscribe,
    unsubscribe,
    socket: socketRef.current
  }
}

// Convenience hooks for specific events
export function useCheckInUpdates(onUpdate: (data: any) => void) {
  const { on } = useRealtime({ autoSubscribe: ['bookings'] })

  useEffect(() => {
    return on('event:check-in', onUpdate)
  }, [on, onUpdate])
}

export function useCheckOutUpdates(onUpdate: (data: any) => void) {
  const { on } = useRealtime({ autoSubscribe: ['bookings'] })

  useEffect(() => {
    return on('event:check-out', onUpdate)
  }, [on, onUpdate])
}

export function useHousekeepingUpdates(onUpdate: (data: any) => void) {
  const { on } = useRealtime({ autoSubscribe: ['housekeeping'] })

  useEffect(() => {
    return on('event:housekeeping-update', onUpdate)
  }, [on, onUpdate])
}

export function useMaintenanceUpdates(onUpdate: (data: any) => void) {
  const { on } = useRealtime({ autoSubscribe: ['maintenance'] })

  useEffect(() => {
    return on('event:maintenance-update', onUpdate)
  }, [on, onUpdate])
}

export function useBookingUpdates(onUpdate: (data: any) => void) {
  const { on } = useRealtime({ autoSubscribe: ['bookings'] })

  useEffect(() => {
    return on('event:booking-change', onUpdate)
  }, [on, onUpdate])
}

export function useRoomStatusUpdates(roomId: string, onUpdate: (data: any) => void) {
  const { on, subscribe } = useRealtime()

  useEffect(() => {
    subscribe(`room:${roomId}`)
    return on('event:room-status-change', onUpdate)
  }, [roomId, on, subscribe, onUpdate])
}
