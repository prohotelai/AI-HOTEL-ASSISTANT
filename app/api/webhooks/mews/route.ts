export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Mews Webhooks Receiver
 * 
 * Receives real-time updates from Mews PMS via webhooks.
 * 
 * Events supported:
 * - reservation.created
 * - reservation.updated
 * - reservation.canceled
 * - reservation.started (check-in)
 * - reservation.processed (check-out)
 * - resource.updated (room status)
 * 
 * Webhook setup in Mews:
 * 1. Go to Integrations > Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/mews
 * 3. Select events to subscribe
 * 4. Save secret key in environment variables
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { eventBus } from '@/lib/events/redisEventBus'
import { prisma } from '@/lib/prisma'

// Webhook payload types
interface MewsWebhookPayload {
  Events: Array<{
    Id: string
    Type: string
    State: number
    CreatedUtc: string
    Data: Record<string, any>
  }>
}

/**
 * Verify Mews webhook signature
 */
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = hmac.digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * POST /api/webhooks/mews
 * Handle incoming Mews webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.MEWS_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Mews Webhook] MEWS_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Get request body as text for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-mews-signature')

    // Verify signature
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.error('[Mews Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse payload
    const payload: MewsWebhookPayload = JSON.parse(rawBody)

    console.log(`[Mews Webhook] Received ${payload.Events.length} events`)

    // Process each event
    for (const event of payload.Events) {
      await processEvent(event)
    }

    return NextResponse.json({ success: true, processed: payload.Events.length })
  } catch (error) {
    console.error('[Mews Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

/**
 * Process individual Mews event
 */
async function processEvent(event: any): Promise<void> {
  try {
    const { Type, Data } = event

    switch (Type) {
      case 'ReservationCreated':
        await handleReservationCreated(Data)
        break

      case 'ReservationUpdated':
        await handleReservationUpdated(Data)
        break

      case 'ReservationCanceled':
        await handleReservationCanceled(Data)
        break

      case 'ReservationStarted':
        await handleReservationStarted(Data)
        break

      case 'ReservationProcessed':
        await handleReservationProcessed(Data)
        break

      case 'ResourceUpdated':
        await handleResourceUpdated(Data)
        break

      default:
        console.log(`[Mews Webhook] Unhandled event type: ${Type}`)
    }
  } catch (error) {
    console.error(`[Mews Webhook] Error processing event ${event.Type}:`, error)
  }
}

/**
 * Handle reservation created event
 */
async function handleReservationCreated(data: any): Promise<void> {
  const { ReservationId, ServiceId } = data

  // Find hotel by Mews service ID
const pmsConfig = await prisma.externalPMSConfig.findFirst({
      where: {
        pmsType: 'MEWS',
        status: 'CONNECTED',
    },
    include: { hotel: true },
  })

  if (!pmsConfig) {
    console.error(`[Mews Webhook] No PMS config found for service ${ServiceId}`)
    return
  }

  // Emit event for sync
  await eventBus.emit(
    'pms.booking.created',
    {
      pmsType: 'MEWS', status: 'CONNECTED',
      externalId: ReservationId,
      action: 'created',
    },
    {
      hotelId: pmsConfig.hotelId,
    }
  )

  console.log(`[Mews Webhook] Booking created: ${ReservationId}`)
}

/**
 * Handle reservation updated event
 */
async function handleReservationUpdated(data: any): Promise<void> {
  const { ReservationId, ServiceId } = data

  const pmsConfig = await prisma.externalPMSConfig.findFirst({
    where: {
      pmsType: 'MEWS', status: 'CONNECTED',
    },
  })

  if (!pmsConfig) return

  await eventBus.emit(
    'pms.booking.updated',
    {
      pmsType: 'MEWS', status: 'CONNECTED',
      externalId: ReservationId,
      action: 'updated',
    },
    {
      hotelId: pmsConfig.hotelId,
    }
  )

  console.log(`[Mews Webhook] Booking updated: ${ReservationId}`)
}

/**
 * Handle reservation canceled event
 */
async function handleReservationCanceled(data: any): Promise<void> {
  const { ReservationId, ServiceId } = data

  const pmsConfig = await prisma.externalPMSConfig.findFirst({
    where: {
      pmsType: 'MEWS', status: 'CONNECTED',
    },
  })

  if (!pmsConfig) return

  await eventBus.emit(
    'pms.booking.canceled',
    {
      pmsType: 'MEWS', status: 'CONNECTED',
      externalId: ReservationId,
      action: 'canceled',
    },
    {
      hotelId: pmsConfig.hotelId,
    }
  )

  console.log(`[Mews Webhook] Booking canceled: ${ReservationId}`)
}

/**
 * Handle reservation started (check-in) event
 */
async function handleReservationStarted(data: any): Promise<void> {
  const { ReservationId, ServiceId } = data

  const pmsConfig = await prisma.externalPMSConfig.findFirst({
    where: {
      pmsType: 'MEWS', status: 'CONNECTED',
    },
  })

  if (!pmsConfig) return

  await eventBus.emit(
    'pms.booking.checkedin',
    {
      pmsType: 'MEWS', status: 'CONNECTED',
      externalId: ReservationId,
      action: 'checkedin',
    },
    {
      hotelId: pmsConfig.hotelId,
    }
  )

  console.log(`[Mews Webhook] Guest checked in: ${ReservationId}`)
}

/**
 * Handle reservation processed (check-out) event
 */
async function handleReservationProcessed(data: any): Promise<void> {
  const { ReservationId, ServiceId } = data

  const pmsConfig = await prisma.externalPMSConfig.findFirst({
    where: {
      pmsType: 'MEWS', status: 'CONNECTED',
    },
  })

  if (!pmsConfig) return

  await eventBus.emit(
    'pms.booking.checkedout',
    {
      pmsType: 'MEWS', status: 'CONNECTED',
      externalId: ReservationId,
      action: 'checkedout',
    },
    {
      hotelId: pmsConfig.hotelId,
    }
  )

  console.log(`[Mews Webhook] Guest checked out: ${ReservationId}`)
}

/**
 * Handle resource (room) updated event
 */
async function handleResourceUpdated(data: any): Promise<void> {
  const { ResourceId, ServiceId } = data

  const pmsConfig = await prisma.externalPMSConfig.findFirst({
    where: {
      pmsType: 'MEWS', status: 'CONNECTED',
    },
  })

  if (!pmsConfig) return

  await eventBus.emit(
    'pms.room.updated',
    {
      pmsType: 'MEWS', status: 'CONNECTED',
      externalId: ResourceId,
      action: 'updated',
    },
    {
      hotelId: pmsConfig.hotelId,
    }
  )

  console.log(`[Mews Webhook] Room updated: ${ResourceId}`)
}
