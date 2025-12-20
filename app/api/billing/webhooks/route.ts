import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Missing Stripe environment variables')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    })

    const body = await req.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Find hotel by Stripe customer ID
  const hotel = await prisma.hotel.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!hotel) {
    console.error(`Hotel not found for Stripe customer: ${customerId}`)
    return
  }

  // Map Stripe price to subscription plan
  const priceId = subscription.items.data[0]?.price.id
  const subscriptionPlan = mapPriceToPlan(priceId)
  
  // Determine if support should be enabled (all paid plans)
  const supportEnabled = subscriptionPlan !== 'STARTER'
  const supportActivatedAt = supportEnabled && !hotel.supportEnabled 
    ? new Date() 
    : hotel.supportActivatedAt

  // Update hotel subscription
  // @ts-expect-error - Stripe API version compatibility
  const currentPeriodEnd = subscription.current_period_end
  await prisma.hotel.update({
    where: { id: hotel.id },
    data: {
      subscriptionPlan,
      subscriptionStatus: mapStripeStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      subscriptionEndsAt: currentPeriodEnd 
        ? new Date(currentPeriodEnd * 1000)
        : null,
      supportEnabled,
      supportActivatedAt,
      // Update usage limits based on plan
      ...getUsageLimitsByPlan(subscriptionPlan),
    }
  })

  console.log(`Updated subscription for hotel ${hotel.id}: ${subscriptionPlan}, support: ${supportEnabled}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const hotel = await prisma.hotel.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!hotel) {
    console.error(`Hotel not found for Stripe customer: ${customerId}`)
    return
  }

  // Downgrade to STARTER and disable support
  await prisma.hotel.update({
    where: { id: hotel.id },
    data: {
      subscriptionPlan: 'STARTER',
      subscriptionStatus: 'CANCELED',
      supportEnabled: false,
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
      ...getUsageLimitsByPlan('STARTER'),
    }
  })

  console.log(`Subscription canceled for hotel ${hotel.id}, support disabled`)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const hotel = await prisma.hotel.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!hotel) return

  // Ensure subscription is active
  await prisma.hotel.update({
    where: { id: hotel.id },
    data: {
      subscriptionStatus: 'ACTIVE',
    }
  })

  console.log(`Payment succeeded for hotel ${hotel.id}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const hotel = await prisma.hotel.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!hotel) return

  // Mark subscription as past due
  await prisma.hotel.update({
    where: { id: hotel.id },
    data: {
      subscriptionStatus: 'PAST_DUE',
    }
  })

  console.log(`Payment failed for hotel ${hotel.id}`)
}

function mapPriceToPlan(priceId: string): 'STARTER' | 'PRO' | 'PRO_PLUS' | 'ENTERPRISE_LITE' | 'ENTERPRISE_MAX' {
  // Map your Stripe price IDs to subscription plans
  const priceMap: Record<string, any> = {
    'price_pro': 'PRO',
    'price_pro_plus': 'PRO_PLUS',
    'price_enterprise_lite': 'ENTERPRISE_LITE',
    'price_enterprise_max': 'ENTERPRISE_MAX',
  }

  return priceMap[priceId] || 'STARTER'
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' {
  const statusMap: Record<Stripe.Subscription.Status, any> = {
    'active': 'ACTIVE',
    'trialing': 'TRIALING',
    'past_due': 'PAST_DUE',
    'canceled': 'CANCELED',
    'unpaid': 'PAST_DUE',
    'incomplete': 'PAST_DUE',
    'incomplete_expired': 'EXPIRED',
    'paused': 'CANCELED',
  }

  return statusMap[status] || 'ACTIVE'
}

function getUsageLimitsByPlan(plan: string) {
  const limits = {
    STARTER: {
      maxAIMessagesPerMonth: 100,
      maxVoiceMinutesPerMonth: 0,
      maxTicketsPerMonth: 10,
      maxStorageGB: 1,
    },
    PRO: {
      maxAIMessagesPerMonth: 1000,
      maxVoiceMinutesPerMonth: 60,
      maxTicketsPerMonth: 99999, // "unlimited"
      maxStorageGB: 10,
    },
    PRO_PLUS: {
      maxAIMessagesPerMonth: 3000,
      maxVoiceMinutesPerMonth: 180,
      maxTicketsPerMonth: 99999,
      maxStorageGB: 25,
    },
    ENTERPRISE_LITE: {
      maxAIMessagesPerMonth: 5000,
      maxVoiceMinutesPerMonth: 300,
      maxTicketsPerMonth: 99999,
      maxStorageGB: 50,
    },
    ENTERPRISE_MAX: {
      maxAIMessagesPerMonth: 10000,
      maxVoiceMinutesPerMonth: 600,
      maxTicketsPerMonth: 99999,
      maxStorageGB: 100,
    },
  }

  return limits[plan as keyof typeof limits] || limits.STARTER
}
