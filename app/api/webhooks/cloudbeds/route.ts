/**
 * Cloudbeds Webhooks Receiver
 * 
 * Receives real-time updates from Cloudbeds PMS via webhooks.
 * 
 * Events supported:
 * - reservation_created
 * - reservation_updated
 * - reservation_canceled
 * - guest_checked_in
 * - guest_checked_out
 * - room_status_changed
 * 
 * Webhook setup in Cloudbeds:
 * 1. Go to Settings > API > Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/cloudbeds
 * 3. Select events to subscribe
 * 4. Save verification token
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { eventBus } from '@/lib/events/redisEventBus'
import { prisma } from '@/lib/prisma'

// Webhook payload types
interface CloudbedsWebhookPayload {
  type: string
  data: Record<string, any>
  timestamp: string
  property_id: string
}

/**
 * Verify Cloudbeds webhook token
 */
function verifyToken(token: string | null, expectedToken: string): boolean {
  if (!token) return false
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  )
}

/**
 * POST /api/webhooks/cloudbeds
 * Handle incoming Cloudbeds webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Get webhook token from environment
    const webhookToken = process.env.CLOUDBEDS_WEBHOOK_TOKEN
    if (!webhookToken) {
      console.error('[Cloudbeds Webhook] CLOUDBEDS_WEBHOOK_TOKEN not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Verify token from query or header
    const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-cloudbeds-token')
    if (!verifyToken(token, webhookToken)) {
      console.error('[Cloudbeds Webhook] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse payload
    const payload: CloudbedsWebhookPayload = await req.json()

    console.log(`[Cloudbeds Webhook] Received event: ${payload.type}`)

    // Process event
    await processEvent(payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Cloudbeds Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

/**
 * Process Cloudbeds event
 */
async function processEvent(payload: CloudbedsWebhookPayload): Promise<void> {
  try {
    const { type, data, property_id } = payload

    // Find hotel by Cloudbeds property ID
    const pmsConfig = await prisma.externalPMSConfig.findFirst({
      where: {
        pmsType: 'CLOUDBEDS',
        status: 'CONNECTED',
      },
      include: { hotel: true },
    })

    if (!pmsConfig) {
      console.error(`[Cloudbeds Webhook] No PMS config found for property ${property_id}`)
      return
    }

    const hotelId = pmsConfig.hotelId

    switch (type) {
      case 'reservation_created':
        await eventBus.emit(
          'pms.booking.created',
          {
            vendor: 'CLOUDBEDS',
            externalId: data.reservationID,
            action: 'created',
            data,
          },
          { hotelId }
        )
        console.log(`[Cloudbeds Webhook] Booking created: ${data.reservationID}`)
        break

      case 'reservation_updated':
        await eventBus.emit(
          'pms.booking.updated',
          {
            vendor: 'CLOUDBEDS',
            externalId: data.reservationID,
            action: 'updated',
            data,
          },
          { hotelId }
        )
        console.log(`[Cloudbeds Webhook] Booking updated: ${data.reservationID}`)
        break

      case 'reservation_canceled':
        await eventBus.emit(
          'pms.booking.canceled',
          {
            vendor: 'CLOUDBEDS',
            externalId: data.reservationID,
            action: 'canceled',
            data,
          },
          { hotelId }
        )
        console.log(`[Cloudbeds Webhook] Booking canceled: ${data.reservationID}`)
        break

      case 'guest_checked_in':
        await eventBus.emit(
          'pms.booking.checkedin',
          {
            vendor: 'CLOUDBEDS',
            externalId: data.reservationID,
            action: 'checkedin',
            data,
          },
          { hotelId }
        )
        console.log(`[Cloudbeds Webhook] Guest checked in: ${data.reservationID}`)
        break

      case 'guest_checked_out':
        await eventBus.emit(
          'pms.booking.checkedout',
          {
            vendor: 'CLOUDBEDS',
            externalId: data.reservationID,
            action: 'checkedout',
            data,
          },
          { hotelId }
        )
        console.log(`[Cloudbeds Webhook] Guest checked out: ${data.reservationID}`)
        break

      case 'room_status_changed':
        await eventBus.emit(
          'pms.room.updated',
          {
            vendor: 'CLOUDBEDS',
            externalId: data.roomID,
            action: 'updated',
            data,
          },
          { hotelId }
        )
        console.log(`[Cloudbeds Webhook] Room updated: ${data.roomID}`)
        break

      default:
        console.log(`[Cloudbeds Webhook] Unhandled event type: ${type}`)
    }
  } catch (error) {
    console.error(`[Cloudbeds Webhook] Error processing event ${payload.type}:`, error)
  }
}
