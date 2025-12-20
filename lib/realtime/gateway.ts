import { createServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import { verify } from 'jsonwebtoken'
import { requireNextAuthSecret } from '@/lib/env'

interface RealtimePayload {
  type: 'CHECK_IN' | 'CHECK_OUT' | 'HOUSEKEEPING_UPDATE' | 'MAINTENANCE_UPDATE' | 'BOOKING_CHANGE' | 'ROOM_STATUS_CHANGE'
  hotelId: string
  data: Record<string, any>
  timestamp: Date
  userId: string
}

interface RoomNamespace {
  roomId?: string
  staffId?: string
  hotelId: string
  userId: string
}

class RealtimeGateway {
  private io: SocketServer
  private connectedUsers = new Map<string, Set<string>>()
  private readonly jwtSecret = requireNextAuthSecret()

  constructor(httpServer?: any) {
    this.io = new SocketServer(httpServer || createServer(), {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication error'))
      }

      try {
        const decoded = verify(token, this.jwtSecret)
        socket.data.user = decoded
        next()
      } catch (err) {
        next(new Error('Invalid token'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = (socket.data.user as any)?.id
      const hotelId = (socket.data.user as any)?.hotelId

      console.log(`[WebSocket] User connected: ${userId} (Hotel: ${hotelId})`)

      // Track connected users per hotel
      if (!this.connectedUsers.has(hotelId)) {
        this.connectedUsers.set(hotelId, new Set())
      }
      this.connectedUsers.get(hotelId)!.add(userId)

      // Join hotel room for broadcasts
      socket.join(`hotel:${hotelId}`)

      // Handle subscriptions
      socket.on('subscribe:room', (roomId: string) => {
        socket.join(`room:${roomId}`)
      })

      socket.on('subscribe:staff', (staffId: string) => {
        socket.join(`staff:${staffId}`)
      })

      socket.on('subscribe:housekeeping', () => {
        socket.join(`hotel:${hotelId}:housekeeping`)
      })

      socket.on('subscribe:maintenance', () => {
        socket.join(`hotel:${hotelId}:maintenance`)
      })

      socket.on('subscribe:bookings', () => {
        socket.join(`hotel:${hotelId}:bookings`)
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        const users = this.connectedUsers.get(hotelId)
        if (users) {
          users.delete(userId)
        }
        console.log(`[WebSocket] User disconnected: ${userId}`)
      })

      // Ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong')
      })
    })
  }

  // Public methods to emit events
  broadcast(payload: RealtimePayload) {
    switch (payload.type) {
      case 'CHECK_IN':
        this.io.to(`hotel:${payload.hotelId}`).emit('event:check-in', payload.data)
        this.io.to(`room:${payload.data.roomId}`).emit('event:room-status', payload.data)
        break

      case 'CHECK_OUT':
        this.io.to(`hotel:${payload.hotelId}`).emit('event:check-out', payload.data)
        this.io.to(`room:${payload.data.roomId}`).emit('event:room-status', payload.data)
        break

      case 'HOUSEKEEPING_UPDATE':
        this.io.to(`hotel:${payload.hotelId}:housekeeping`).emit('event:housekeeping-update', payload.data)
        this.io.to(`staff:${payload.data.assignedStaff}`).emit('event:task-assigned', payload.data)
        break

      case 'MAINTENANCE_UPDATE':
        this.io.to(`hotel:${payload.hotelId}:maintenance`).emit('event:maintenance-update', payload.data)
        this.io.to(`staff:${payload.data.assignedStaff}`).emit('event:work-order-update', payload.data)
        break

      case 'BOOKING_CHANGE':
        this.io.to(`hotel:${payload.hotelId}:bookings`).emit('event:booking-change', payload.data)
        this.io.to(`room:${payload.data.roomId}`).emit('event:room-booking-change', payload.data)
        break

      case 'ROOM_STATUS_CHANGE':
        this.io.to(`room:${payload.data.roomId}`).emit('event:room-status-change', payload.data)
        this.io.to(`hotel:${payload.hotelId}`).emit('event:room-status-changed', payload.data)
        break
    }
  }

  broadcastToHotel(hotelId: string, event: string, data: any) {
    this.io.to(`hotel:${hotelId}`).emit(event, data)
  }

  broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(`room:${roomId}`).emit(event, data)
  }

  broadcastToStaff(staffId: string, event: string, data: any) {
    this.io.to(`staff:${staffId}`).emit(event, data)
  }

  getConnectedUsers(hotelId: string): number {
    return this.connectedUsers.get(hotelId)?.size || 0
  }

  getServer(): SocketServer {
    return this.io
  }
}

// Singleton instance
let gateway: RealtimeGateway | null = null

export function initializeRealtimeGateway(httpServer?: any): RealtimeGateway {
  if (!gateway) {
    gateway = new RealtimeGateway(httpServer)
  }
  return gateway
}

export function getRealtimeGateway(): RealtimeGateway {
  if (!gateway) {
    throw new Error('RealtimeGateway not initialized. Call initializeRealtimeGateway first.')
  }
  return gateway
}

export default RealtimeGateway
