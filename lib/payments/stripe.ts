/**
 * Stripe Payment Integration
 *
 * Handles:
 * - Payment processing for invoices
 * - Payment intents for bookings
 * - Webhook handling for payment events
 * - Multi-tenant payment tracking
 * - Graceful fallback if not configured
 */

import Stripe from 'stripe'
import { isStripeConfigured, requireStripe, getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

// ============================================================================
// 1. STRIPE CLIENT (singleton)
// ============================================================================

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured()) {
    return null
  }

  if (!stripeClient) {
    try {
      const apiKey = requireStripe()
      stripeClient = new Stripe(apiKey, {
        apiVersion: '2025-11-17.clover',
        typescript: true,
      })
      logger.info('Stripe client initialized')
    } catch (error) {
      logger.warn('Failed to initialize Stripe client', { error: (error as Error).message })
      return null
    }
  }

  return stripeClient
}

// ============================================================================
// 2. CUSTOMER MANAGEMENT
// ============================================================================

/**
 * Create or get Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  email: string,
  hotelId: string,
  name?: string
): Promise<{ customerId: string; isNew: boolean } | null> {
  const client = getStripeClient()
  if (!client) return null

  try {
    // Check if customer already exists
    const existing = await client.customers.list({
      email,
      limit: 1,
    })

    if (existing.data.length > 0) {
      logger.debug('Found existing Stripe customer', { customerId: existing.data[0].id })
      return {
        customerId: existing.data[0].id,
        isNew: false,
      }
    }

    // Create new customer
    const customer = await client.customers.create({
      email,
      name: name || email,
      metadata: {
        hotelId, // Multi-tenant tracking
      },
    })

    logger.info('Created Stripe customer', { customerId: customer.id })
    return {
      customerId: customer.id,
      isNew: true,
    }
  } catch (error) {
    logger.error('Failed to get/create Stripe customer', { error: (error as Error).message })
    return null
  }
}

// ============================================================================
// 3. PAYMENT INTENT (for bookings/deposits)
// ============================================================================

export interface PaymentIntentRequest {
  amount: number // in cents (e.g., $10.00 = 1000)
  currency?: string // default 'usd'
  customerId: string
  description: string
  metadata?: Record<string, string>
}

/**
 * Create a payment intent for a booking
 */
export async function createPaymentIntent(
  request: PaymentIntentRequest
): Promise<{ clientSecret: string; intentId: string } | null> {
  const client = getStripeClient()
  if (!client) {
    logger.debug('Stripe not configured, skipping payment intent')
    return null
  }

  try {
    const intent = await client.paymentIntents.create({
      amount: request.amount,
      currency: request.currency || 'usd',
      customer: request.customerId,
      description: request.description,
      metadata: request.metadata || {},
      // Automatic payment methods (enables card, Apple Pay, Google Pay, etc.)
      automatic_payment_methods: {
        enabled: true,
      },
    })

    logger.info('Created payment intent', {
      intentId: intent.id,
      amount: request.amount,
    })

    return {
      clientSecret: intent.client_secret || '',
      intentId: intent.id,
    }
  } catch (error) {
    logger.error('Failed to create payment intent', { error: (error as Error).message })
    return null
  }
}

/**
 * Confirm a payment intent (charge the card)
 */
export async function confirmPaymentIntent(
  intentId: string,
  paymentMethodId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const client = getStripeClient()
  if (!client) return { success: false, error: 'Stripe not configured' }

  try {
    const intent = await client.paymentIntents.confirm(intentId, {
      payment_method: paymentMethodId,
    })

    logger.info('Confirmed payment intent', {
      intentId,
      status: intent.status,
    })

    return {
      success: intent.status === 'succeeded',
      status: intent.status,
    }
  } catch (error) {
    logger.error('Failed to confirm payment intent', {
      intentId,
      error: (error as Error).message,
    })
    return { success: false, error: (error as Error).message }
  }
}

// ============================================================================
// 4. INVOICE PAYMENT
// ============================================================================

export interface InvoicePaymentRequest {
  invoiceId: string
  hotelId: string
  customerId: string
  amount: number
  description: string
  successUrl: string
  cancelUrl: string
}

/**
 * Create a payment link for an invoice
 * Returns a URL guests can visit to pay
 */
export async function createInvoicePaymentLink(
  request: InvoicePaymentRequest
): Promise<{ paymentUrl: string; linkId: string } | null> {
  const client = getStripeClient()
  if (!client) {
    logger.debug('Stripe not configured, skipping payment link')
    return null
  }

  try {
    const link = await client.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${request.invoiceId}`,
              description: request.description,
              metadata: {
                hotelId: request.hotelId,
                invoiceId: request.invoiceId,
              },
            },
            unit_amount: request.amount,
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: request.successUrl,
        },
      },
    } as any)

    logger.info('Created payment link', {
      linkId: link.id,
      invoiceId: request.invoiceId,
    })

    return {
      paymentUrl: link.url || '',
      linkId: link.id,
    }
  } catch (error) {
    logger.error('Failed to create payment link', {
      invoiceId: request.invoiceId,
      error: (error as Error).message,
    })
    return null
  }
}

// ============================================================================
// 5. WEBHOOK HANDLING
// ============================================================================

/**
 * Verify and parse Stripe webhook
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string
): Stripe.Event | null {
  const client = getStripeClient()
  if (!client) return null

  try {
    const env = getEnv()
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      logger.warn('Stripe webhook secret not configured')
      return null
    }

    const event = client.webhooks.constructEvent(body, signature, webhookSecret)
    return event
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: (error as Error).message })
    return null
  }
}

/**
 * Handle payment.intent.succeeded event
 */
export async function handlePaymentSucceeded(
  intentId: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Update invoice as paid
    if (metadata.invoiceId) {
      // TODO: Update invoice payment status in database
      logger.info('Invoice payment succeeded', { invoiceId: metadata.invoiceId, intentId })
    }

    // TODO: Send payment confirmation email
    // TODO: Create accounting entry
  } catch (error) {
    logger.error('Failed to handle payment success', { error: (error as Error).message })
  }
}

/**
 * Handle payment.intent.payment_failed event
 */
export async function handlePaymentFailed(
  intentId: string,
  metadata: Record<string, any>,
  error?: string
): Promise<void> {
  try {
    logger.warn('Payment failed', { intentId, error })

    // TODO: Send payment failure notification email
    // TODO: Retry logic if needed
  } catch (err) {
    logger.error('Failed to handle payment failure', { error: (err as Error).message })
  }
}

// ============================================================================
// 6. PAYMENT STATUS CHECKS
// ============================================================================

export function isPaymentAvailable(): boolean {
  return !!getStripeClient()
}

/**
 * Get payment intent status
 */
export async function getPaymentIntentStatus(intentId: string): Promise<string | null> {
  const client = getStripeClient()
  if (!client) return null

  try {
    const intent = await client.paymentIntents.retrieve(intentId)
    return intent.status
  } catch (error) {
    logger.error('Failed to retrieve payment intent', { error: (error as Error).message })
    return null
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(intentId: string, amount?: number): Promise<boolean> {
  const client = getStripeClient()
  if (!client) return false

  try {
    const refund = await client.refunds.create({
      payment_intent: intentId,
      amount, // omit for full refund
    })

    logger.info('Payment refunded', { refundId: refund.id })
    return true
  } catch (error) {
    logger.error('Failed to refund payment', {
      intentId,
      error: (error as Error).message,
    })
    return false
  }
}
