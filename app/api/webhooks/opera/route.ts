export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Opera Cloud Webhooks Receiver
 * 
 * Receives real-time updates from Oracle Opera Cloud via webhooks.
 * 
 * Events supported:
 * - NEW_RESERVATION
 * - UPDATE_RESERVATION
 * - CANCEL_RESERVATION
 * - CHECK_IN
 * - CHECK_OUT
 * - ROOM_STATUS_UPDATE
 * 
 * Webhook setup in Opera Cloud:
 * 1. Go to Configuration > Integration > Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/opera
 * 3. Select events to subscribe
 * 4. Configure HMAC-SHA256 signature
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { eventBus } from '@/lib/events/redisEventBus'
import { prisma } from '@/lib/prisma'

// Webhook payload types
interface OperaWebhookPayload {
  eventType: string
  hotelId: string
  timestamp: string
  data: {
    reservationId?: string
    confirmationNumber?: string
    roomId?: string
    guestId?: string
    [key: string]: any
  }
}

/**
 * Verify Opera webhook signature (HMAC-SHA256)
 */
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = `sha256=${hmac.digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * POST /api/webhooks/opera
 * Handle incoming Opera Cloud webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.OPERA_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Opera Webhook] OPERA_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Get request body as text for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-opera-signature')

    // Verify signature
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.error('[Opera Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse payload
    const payload: OperaWebhookPayload = JSON.parse(rawBody)

    console.log(`[Opera Webhook] Received event: ${payload.eventType}`)

    // Process event
    await processEvent(payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Opera Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

/**
 * Process Opera Cloud event
 */
async function processEvent(payload: OperaWebhookPayload): Promise<void> {
  try {
    const { eventType, hotelId: operaHotelId, data } = payload

    // Find hotel by Opera hotel ID
    const pmsConfig = await prisma.externalPMSConfig.findFirst({
      where: {
        pmsType: 'OPERA',
        status: 'CONNECTED',
      },
      include: { hotel: true },
    })

    if (!pmsConfig) {
      console.error(`[Opera Webhook] No PMS config found for hotel ${operaHotelId}`)
      return
    }

    const hotelId = pmsConfig.hotelId

    switch (eventType) {
      case 'NEW_RESERVATION':
        await eventBus.emit(
          'pms.booking.created',
          {
            vendor: 'OPERA',
            externalId: data.reservationId || data.confirmationNumber,
            action: 'created',
            data,
          },
          { hotelId }
        )
        console.log(`[Opera Webhook] Booking created: ${data.reservationId}`)
        break

      case 'UPDATE_RESERVATION':
        await eventBus.emit(
          'pms.booking.updated',
          {
            vendor: 'OPERA',
            externalId: data.reservationId || data.confirmationNumber,
            action: 'updated',
            data,
          },
          { hotelId }
        )
        console.log(`[Opera Webhook] Booking updated: ${data.reservationId}`)
        break

      case 'CANCEL_RESERVATION':
        await eventBus.emit(
          'pms.booking.canceled',
          {
            vendor: 'OPERA',
            externalId: data.reservationId || data.confirmationNumber,
            action: 'canceled',
            data,
          },
          { hotelId }
        )
        console.log(`[Opera Webhook] Booking canceled: ${data.reservationId}`)
        break

      case 'CHECK_IN':
        await eventBus.emit(
          'pms.booking.checkedin',
          {
            vendor: 'OPERA',
            externalId: data.reservationId || data.confirmationNumber,
            action: 'checkedin',
            data,
          },
          { hotelId }
        )
        console.log(`[Opera Webhook] Guest checked in: ${data.reservationId}`)
        break

      case 'CHECK_OUT':
        await eventBus.emit(
          'pms.booking.checkedout',
          {
            vendor: 'OPERA',
            externalId: data.reservationId || data.confirmationNumber,
            action: 'checkedout',
            data,
          },
          { hotelId }
        )
        console.log(`[Opera Webhook] Guest checked out: ${data.reservationId}`)
        break

      case 'ROOM_STATUS_UPDATE':
        await eventBus.emit(
          'pms.room.updated',
          {
            vendor: 'OPERA',
            externalId: data.roomId,
            action: 'updated',
            data,
          },
          { hotelId }
        )
        console.log(`[Opera Webhook] Room updated: ${data.roomId}`)
        break

      default:
        console.log(`[Opera Webhook] Unhandled event type: ${eventType}`)
    }
  } catch (error) {
    console.error(`[Opera Webhook] Error processing event ${payload.eventType}:`, error)
  }
}
