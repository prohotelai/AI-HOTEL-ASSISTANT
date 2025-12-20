/**
 * Resend Email Integration
 *
 * Handles:
 * - Sending transactional emails via Resend
 * - Email templates with variables
 * - Multi-tenant support (hotel-specific sender)
 * - Graceful fallback if not configured
 * - Logging without exposing sensitive data
 */

import { Resend } from 'resend'
import { isEmailConfigured, requireResend } from '@/lib/env'
import { logger } from '@/lib/logger'

// ============================================================================
// 1. RESEND CLIENT (singleton)
// ============================================================================

let resendClient: Resend | null = null

export function getResendClient(): Resend | null {
  if (!isEmailConfigured()) {
    return null
  }

  if (!resendClient) {
    try {
      const creds = requireResend()
      resendClient = new Resend(creds.apiKey)
      logger.info('Resend email client initialized')
    } catch (error) {
      logger.warn('Failed to initialize Resend client', { error: (error as Error).message })
      return null
    }
  }

  return resendClient
}

// ============================================================================
// 2. EMAIL TEMPLATES
// ============================================================================

interface EmailTemplate {
  subject: string
  html: string
}

function createWelcomeTemplate(hotelName: string, loginUrl: string): EmailTemplate {
  return {
    subject: `Welcome to ${hotelName} - Hotel Management Suite`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1>Welcome to ${hotelName}!</h1>
        <p>Your hotel management suite is ready to use.</p>
        <p>
          <a href="${loginUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
            Login Now
          </a>
        </p>
        <p>If you have any questions, contact our support team.</p>
      </div>
    `,
  }
}

function createPasswordResetTemplate(resetUrl: string, expiryMinutes: number = 60): EmailTemplate {
  return {
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password. This link expires in ${expiryMinutes} minutes.</p>
        <p>
          <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  }
}

function createInvoiceTemplate(
  guestName: string,
  invoiceNumber: string,
  totalAmount: number,
  invoiceUrl: string
): EmailTemplate {
  return {
    subject: `Invoice #${invoiceNumber} - Payment Due`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1>Invoice #${invoiceNumber}</h1>
        <p>Dear ${guestName},</p>
        <p>Your invoice is ready for payment.</p>
        <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
        <p>
          <a href="${invoiceUrl}" style="background-color: #10B981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
            View Invoice
          </a>
        </p>
        <p>Payment details will be included in the attached PDF.</p>
      </div>
    `,
  }
}

function createTicketNotificationTemplate(
  ticketId: string,
  subject: string,
  message: string,
  dashboardUrl: string
): EmailTemplate {
  return {
    subject: `New Support Ticket: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1>New Support Ticket</h1>
        <p><strong>Ticket ID:</strong> ${ticketId}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p>
          <a href="${dashboardUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
            View in Dashboard
          </a>
        </p>
      </div>
    `,
  }
}

// ============================================================================
// 3. EMAIL SENDING
// ============================================================================

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

/**
 * Send email via Resend
 * Logs send status without exposing recipient details
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient()

  if (!client) {
    logger.debug('Email service not configured, skipping send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const creds = requireResend()
    const from = options.from || creds.from

    const response = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    })

    if (response.error) {
      logger.warn('Failed to send email', {
        error: response.error.message,
      })
      return { success: false, error: response.error.message }
    }

    logger.info('Email sent', {
      id: response.data?.id,
      // Don't log recipient email
    })

    return { success: true }
  } catch (error) {
    logger.error('Email send error', { error: (error as Error).message })
    return { success: false, error: (error as Error).message }
  }
}

// ============================================================================
// 4. TEMPLATED EMAILS (High-level API)
// ============================================================================

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  email: string,
  hotelName: string,
  loginUrl: string
): Promise<{ success: boolean; error?: string }> {
  const template = createWelcomeTemplate(hotelName, loginUrl)
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  expiryMinutes?: number
): Promise<{ success: boolean; error?: string }> {
  const template = createPasswordResetTemplate(resetUrl, expiryMinutes)
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })
}

/**
 * Send invoice email to guest
 */
export async function sendInvoiceEmail(
  email: string,
  guestName: string,
  invoiceNumber: string,
  totalAmount: number,
  invoiceUrl: string
): Promise<{ success: boolean; error?: string }> {
  const template = createInvoiceTemplate(guestName, invoiceNumber, totalAmount, invoiceUrl)
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })
}

/**
 * Send ticket notification email
 */
export async function sendTicketNotificationEmail(
  email: string,
  ticketId: string,
  subject: string,
  message: string,
  dashboardUrl: string
): Promise<{ success: boolean; error?: string }> {
  const template = createTicketNotificationTemplate(ticketId, subject, message, dashboardUrl)
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })
}

/**
 * Send daily housekeeping report
 */
export async function sendHousekeepingReportEmail(
  email: string,
  hotelName: string,
  date: string,
  tasksCompleted: number,
  tasksPending: number,
  reportUrl: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1>Daily Housekeeping Report - ${hotelName}</h1>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Tasks Completed:</strong> ${tasksCompleted}</p>
      <p><strong>Tasks Pending:</strong> ${tasksPending}</p>
      <p>
        <a href="${reportUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
          View Full Report
        </a>
      </p>
    </div>
  `

  return sendEmail({
    to: email,
    subject: `Daily Housekeeping Report - ${hotelName}`,
    html,
  })
}

/**
 * Check if email service is available
 */
export function isEmailAvailable(): boolean {
  return !!getResendClient()
}
