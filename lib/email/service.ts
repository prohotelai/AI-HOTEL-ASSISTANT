/**
 * Email notification system with template engine
 * Supports: check-in, checkout, work order assignment, low inventory alerts, booking confirmations
 */

import nodemailer from 'nodemailer'
import { Resend } from 'resend'

export interface EmailConfig {
  provider: 'smtp' | 'resend'
  from: string
  hotelName: string
}

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

// Email template types
export enum EmailTemplateType {
  CHECK_IN_CONFIRMED = 'check-in-confirmed',
  CHECKOUT_INVOICE = 'checkout-invoice',
  WORK_ORDER_ASSIGNED = 'work-order-assigned',
  MAINTENANCE_ALERT = 'maintenance-alert',
  LOW_INVENTORY = 'low-inventory',
  BOOKING_CONFIRMATION = 'booking-confirmation',
  PAYMENT_RECEIVED = 'payment-received',
  GUEST_FEEDBACK = 'guest-feedback',
  STAFF_SCHEDULE = 'staff-schedule'
}

// Template data interfaces
export interface CheckInData {
  guestName: string
  email: string
  hotelName: string
  checkInDate: string
  roomNumber: string
  roomType: string
  numberOfGuests: number
  specialRequests?: string
  hotelAddress: string
  hotelPhone: string
  checkInTime: string
  bookingId?: string
}

export interface CheckoutInvoiceData {
  guestName: string
  email: string
  hotelName: string
  checkOutDate: string
  roomNumber: string
  numberOfNights: number
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  bookingId: string
}

export interface WorkOrderAssignmentData {
  staffName: string
  email: string
  hotelName: string
  workOrderId: string
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location: string
  dueDate: string
  estimatedTime: number
}

export interface MaintenanceAlertData {
  email: string
  hotelName: string
  itemName: string
  lastMaintenance: string
  dueDate: string
  estimatedDowntime: number
  priority: 'low' | 'medium' | 'high'
}

export interface LowInventoryData {
  email: string
  hotelName: string
  itemName: string
  quantity: number
  minimumThreshold: number
  category: string
}

export interface BookingConfirmationData {
  guestName: string
  email: string
  hotelName: string
  bookingId: string
  checkInDate: string
  checkOutDate: string
  roomNumber: string
  totalPrice: number
  numberOfGuests: number
  specialRequests?: string
}

// Email Template Engine
export class EmailTemplateEngine {
  private templates: Map<EmailTemplateType, (data: any) => string> = new Map()

  constructor() {
    this.registerDefaultTemplates()
  }

  private registerDefaultTemplates() {
    this.templates.set(EmailTemplateType.CHECK_IN_CONFIRMED, this.checkInTemplate)
    this.templates.set(EmailTemplateType.CHECKOUT_INVOICE, this.checkoutTemplate)
    this.templates.set(EmailTemplateType.WORK_ORDER_ASSIGNED, this.workOrderTemplate)
    this.templates.set(EmailTemplateType.BOOKING_CONFIRMATION, this.bookingConfirmationTemplate)
    this.templates.set(EmailTemplateType.LOW_INVENTORY, this.lowInventoryTemplate)
  }

  private checkInTemplate(data: CheckInData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .detail { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #2563eb; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${data.hotelName}!</h1>
      <p>Check-In Confirmed</p>
    </div>
    <div class="content">
      <p>Dear ${data.guestName},</p>
      <p>Your check-in has been confirmed. We're excited to host you!</p>
      
      <div class="detail">
        <strong>Check-In Date:</strong> ${data.checkInDate}<br/>
        <strong>Check-In Time:</strong> ${data.checkInTime}
      </div>
      
      <div class="detail">
        <strong>Room Number:</strong> ${data.roomNumber}<br/>
        <strong>Room Type:</strong> ${data.roomType}<br/>
        <strong>Number of Guests:</strong> ${data.numberOfGuests}
      </div>
      
      ${data.specialRequests ? `
      <div class="detail">
        <strong>Special Requests:</strong> ${data.specialRequests}
      </div>
      ` : ''}
      
      <div class="detail">
        <strong>Hotel Address:</strong> ${data.hotelAddress}<br/>
        <strong>Hotel Phone:</strong> ${data.hotelPhone}
      </div>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <a href="https://example.com/booking/${data.bookingId}" class="button">View Booking Details</a>
    </div>
    <div class="footer">
      <p>&copy; ${data.hotelName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  private checkoutTemplate(data: CheckoutInvoiceData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: bold; }
    .total { background: #f0f9ff; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice - ${data.hotelName}</h1>
      <p>Booking ID: ${data.bookingId}</p>
    </div>
    <div class="content">
      <p>Dear ${data.guestName},</p>
      <p>Thank you for staying with us! Here's your checkout invoice:</p>
      
      <table>
        <tr>
          <td><strong>Room:</strong> ${data.roomNumber}</td>
          <td><strong>Nights:</strong> ${data.numberOfNights}</td>
        </tr>
        <tr>
          <td><strong>Check-Out:</strong> ${data.checkOutDate}</td>
          <td><strong>Payment Method:</strong> ${data.paymentMethod}</td>
        </tr>
      </table>
      
      <table>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount</th>
        </tr>
        <tr>
          <td>Room Charges (${data.numberOfNights} nights)</td>
          <td style="text-align: right;">$${data.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Tax</td>
          <td style="text-align: right;">$${data.tax.toFixed(2)}</td>
        </tr>
        <tr class="total">
          <td>Total</td>
          <td style="text-align: right;">$${data.total.toFixed(2)}</td>
        </tr>
      </table>
      
      <p>We hope you enjoyed your stay. Please visit us again soon!</p>
    </div>
    <div class="footer">
      <p>&copy; ${data.hotelName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  private workOrderTemplate(data: WorkOrderAssignmentData): string {
    const priorityColors: { [key: string]: string } = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .detail { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #7c3aed; }
    .priority { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; background: ${priorityColors[data.priority]}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Work Order Assigned</h1>
      <p>${data.hotelName}</p>
    </div>
    <div class="content">
      <p>Hi ${data.staffName},</p>
      <p>You've been assigned a new work order. Please review the details below:</p>
      
      <div class="detail">
        <strong>Work Order ID:</strong> ${data.workOrderId}<br/>
        <strong>Title:</strong> ${data.title}<br/>
        <strong>Priority:</strong> <span class="priority">${data.priority.toUpperCase()}</span>
      </div>
      
      <div class="detail">
        <strong>Description:</strong><br/>
        ${data.description}
      </div>
      
      <div class="detail">
        <strong>Category:</strong> ${data.category}<br/>
        <strong>Location:</strong> ${data.location}<br/>
        <strong>Due Date:</strong> ${data.dueDate}<br/>
        <strong>Estimated Time:</strong> ${data.estimatedTime} minutes
      </div>
      
      <p>Please complete this work order by the due date. If you have any questions, contact your manager.</p>
    </div>
    <div class="footer">
      <p>&copy; ${data.hotelName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  private bookingConfirmationTemplate(data: BookingConfirmationData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0891b2; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .detail { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #0891b2; }
    .button { background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmation</h1>
      <p>${data.bookingId}</p>
    </div>
    <div class="content">
      <p>Dear ${data.guestName},</p>
      <p>Thank you for booking with us! Your reservation is confirmed.</p>
      
      <div class="detail">
        <strong>Check-In:</strong> ${data.checkInDate}<br/>
        <strong>Check-Out:</strong> ${data.checkOutDate}<br/>
        <strong>Room Number:</strong> ${data.roomNumber}
      </div>
      
      <div class="detail">
        <strong>Number of Guests:</strong> ${data.numberOfGuests}<br/>
        <strong>Total Price:</strong> $${data.totalPrice.toFixed(2)}
      </div>
      
      ${data.specialRequests ? `
      <div class="detail">
        <strong>Special Requests:</strong> ${data.specialRequests}
      </div>
      ` : ''}
      
      <p>You'll receive a check-in reminder email 24 hours before your arrival.</p>
      <a href="https://example.com/booking/${data.bookingId}" class="button">Manage Booking</a>
    </div>
    <div class="footer">
      <p>&copy; ${data.hotelName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  private lowInventoryTemplate(data: LowInventoryData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .alert { background: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Low Inventory Alert</h1>
      <p>${data.hotelName}</p>
    </div>
    <div class="content">
      <div class="alert">
        <strong>Warning:</strong> The inventory level for <strong>${data.itemName}</strong> is below the minimum threshold.
      </div>
      
      <p>Current Status:</p>
      <ul>
        <li><strong>Item:</strong> ${data.itemName}</li>
        <li><strong>Category:</strong> ${data.category}</li>
        <li><strong>Current Quantity:</strong> ${data.quantity}</li>
        <li><strong>Minimum Threshold:</strong> ${data.minimumThreshold}</li>
      </ul>
      
      <p>Please reorder this item as soon as possible to maintain inventory levels.</p>
    </div>
    <div class="footer">
      <p>&copy; ${data.hotelName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  public render(templateType: EmailTemplateType, data: any): string {
    const template = this.templates.get(templateType)
    if (!template) {
      throw new Error(`Template not found: ${templateType}`)
    }
    return template.call(this, data)
  }
}

// Email Service
export class EmailService {
  private config: EmailConfig
  private templateEngine: EmailTemplateEngine
  private transporter?: any
  private resend?: any

  constructor(config: EmailConfig) {
    this.config = config
    this.templateEngine = new EmailTemplateEngine()
    this.initializeProvider()
  }

  private initializeProvider() {
    if (this.config.provider === 'smtp') {
      // Initialize SMTP (configure with your SMTP settings)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      })
    } else if (this.config.provider === 'resend') {
      // Initialize Resend
      this.resend = new Resend(process.env.RESEND_API_KEY)
    }
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    if (this.config.provider === 'smtp' && this.transporter) {
      await this.transporter.sendMail({
        from: this.config.from,
        to: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || payload.html.replace(/<[^>]*>/g, '')
      })
    } else if (this.config.provider === 'resend' && this.resend) {
      await this.resend.emails.send({
        from: this.config.from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html
      })
    }
  }

  async sendCheckInConfirmation(data: CheckInData): Promise<void> {
    const html = this.templateEngine.render(EmailTemplateType.CHECK_IN_CONFIRMED, data)
    await this.sendEmail({
      to: data.email,
      subject: `Check-In Confirmed - ${data.hotelName}`,
      html
    })
  }

  async sendCheckoutInvoice(data: CheckoutInvoiceData): Promise<void> {
    const html = this.templateEngine.render(EmailTemplateType.CHECKOUT_INVOICE, data)
    await this.sendEmail({
      to: data.email,
      subject: `Invoice - ${data.hotelName}`,
      html
    })
  }

  async sendWorkOrderAssignment(data: WorkOrderAssignmentData): Promise<void> {
    const html = this.templateEngine.render(EmailTemplateType.WORK_ORDER_ASSIGNED, data)
    await this.sendEmail({
      to: data.email,
      subject: `Work Order Assigned - ${data.hotelName}`,
      html
    })
  }

  async sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
    const html = this.templateEngine.render(EmailTemplateType.BOOKING_CONFIRMATION, data)
    await this.sendEmail({
      to: data.email,
      subject: `Booking Confirmed - ${data.hotelName}`,
      html
    })
  }

  async sendLowInventoryAlert(data: LowInventoryData): Promise<void> {
    const html = this.templateEngine.render(EmailTemplateType.LOW_INVENTORY, data)
    await this.sendEmail({
      to: data.email,
      subject: `Low Inventory Alert - ${data.itemName}`,
      html
    })
  }
}

// Singleton instance
let emailServiceInstance: EmailService

export function initializeEmailService(config: EmailConfig): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(config)
  }
  return emailServiceInstance
}

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    throw new Error('Email service not initialized. Call initializeEmailService first.')
  }
  return emailServiceInstance
}
